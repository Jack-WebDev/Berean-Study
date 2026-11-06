import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import type { DbExecutor } from "../src/db-executor";
import { bookAliases } from "../src/schema/book_aliases";
import { books } from "../src/schema/books";
import { canonBooks } from "../src/schema/canon_books";
import { canonTraditions } from "../src/schema/canon_traditions";
import { chapters } from "../src/schema/chapters";
import { commentaries } from "../src/schema/commentaries";
import { notifications } from "../src/schema/notifications";
import { passageRanges } from "../src/schema/passage_ranges";
import { passages } from "../src/schema/passages";
import { translations } from "../src/schema/translations";
import { versePresence } from "../src/schema/verse_presence";
import { verseTexts } from "../src/schema/verse_texts";
import { verses } from "../src/schema/verses";
import {
	getBookStructure,
	getScriptureBook,
	listScriptureBooks,
	suggestBookChange,
	updateBookRecord,
} from "../src/scripture-data";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import {
	getTranslationsOverview,
	publishingBlock,
	recordTranslationPermission,
	removeTranslationPermission,
	updateTranslationDetails,
} from "../src/translations-admin";
import {
	createPerson,
	inRolledBackTransaction,
	withFreshCatalogue,
} from "./governance-helpers";

const record = {
	name: "Romans",
	fullTitle: "The Epistle to the Romans",
	testament: "new" as const,
	group: "Pauline epistles" as const,
	aliases: ["Rom", "Ro"],
};

async function bookId(tx: DbExecutor, slug: string) {
	const [book] = await tx
		.select({ id: books.id })
		.from(books)
		.where(eq(books.slug, slug));
	if (!book) throw new Error(`No book ${slug}`);
	return book.id;
}

async function translationId(tx: DbExecutor, abbreviation: string) {
	const [translation] = await tx
		.select({ id: translations.id })
		.from(translations)
		.where(eq(translations.abbreviation, abbreviation));
	if (!translation) throw new Error(`No translation ${abbreviation}`);
	return translation.id;
}

async function addChapter(
	tx: DbExecutor,
	slug: string,
	number: number,
	verseCount: number,
) {
	const { versificationId } = await applyScriptureCatalogue(tx);
	const [chapter] = await tx
		.insert(chapters)
		.values({
			bookId: await bookId(tx, slug),
			versificationSystemId: versificationId,
			number,
		})
		.returning({ id: chapters.id });
	if (!chapter) throw new Error("No chapter");
	return tx
		.insert(verses)
		.values(
			Array.from({ length: verseCount }, (_, index) => ({
				chapterId: chapter.id,
				number: index + 1,
			})),
		)
		.returning({ id: verses.id, number: verses.number });
}

describe.runIf(process.env.DATABASE_URL)("Scripture data", () => {
	afterAll(async () => {
		await pool.end();
	});

	describe("catalogue setup", () => {
		it("adds everything once, in order", async () => {
			await inRolledBackTransaction(async (tx) => {
				const first = await applyScriptureCatalogue(tx);
				const second = await applyScriptureCatalogue(tx);

				expect(second).toEqual(first);
				expect(first.bookIds).toHaveLength(76);
				expect(first.translationIds).toHaveLength(6);

				const positions = await tx
					.select({ position: canonBooks.canonicalOrder })
					.from(canonBooks)
					.innerJoin(
						canonTraditions,
						eq(canonTraditions.id, canonBooks.canonId),
					)
					.where(eq(canonTraditions.slug, "catholic"));
				expect(positions).toHaveLength(73);
			});
		});

		it("never overwrites a Superadmin's corrections", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				await applyScriptureCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				await updateBookRecord(tx, {
					...record,
					name: "Epistle to the Romans",
					aliases: ["Rmn"],
					actorUserId: superadmin.id,
					slug: "romans",
				});

				await applyScriptureCatalogue(tx);

				const [romans] = await tx
					.select({ name: books.name })
					.from(books)
					.where(eq(books.slug, "romans"));
				expect(romans?.name).toBe("Epistle to the Romans");
				expect(
					await tx
						.select({ alias: bookAliases.alias })
						.from(bookAliases)
						.where(eq(bookAliases.bookId, await bookId(tx, "romans"))),
				).toEqual([{ alias: "Rmn" }]);
			});
		});
	});

	describe("books", () => {
		it("lists the catalogue in canonical order, ignoring other rows", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyScriptureCatalogue(tx);
				await tx.insert(books).values({
					name: `Stray ${randomUUID()}`,
					slug: `stray-${randomUUID()}`,
					testament: "old",
				});

				const list = await listScriptureBooks(tx);

				expect(list).toHaveLength(76);
				expect(list[0]?.slug).toBe("genesis");
				expect(list[65]?.slug).toBe("revelation");
				expect(list[66]?.slug).toBe("tobit");
			});
		});

		it("shows a book's position in each canon, and its structure", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyScriptureCatalogue(tx);
				await addChapter(tx, "romans", 1, 3);

				const romans = await getScriptureBook(tx, "romans");

				expect(romans).toMatchObject({
					group: "Pauline epistles",
					chapters: 1,
					verses: 3,
					translationsWithText: 0,
					totalTranslations: 6,
				});
				expect(romans?.aliases).toEqual(["Ro", "Rm"].sort());
				expect(romans?.canons).toEqual([
					{ name: "Protestant", position: 45, size: 66 },
					{ name: "Catholic", position: 52, size: 73 },
					{ name: "Eastern Orthodox", position: 55, size: 76 },
					{ name: "Ethiopian Orthodox Tewahedo", position: null, size: 0 },
				]);
			});
		});

		it("returns nothing for an unknown book", async () => {
			await inRolledBackTransaction(async (tx) => {
				expect(await getScriptureBook(tx, "nonsense")).toBeNull();
				expect(await getBookStructure(tx, { slug: "nonsense" })).toBeNull();
			});
		});
	});

	describe("structure", () => {
		it("starts empty, because chapters only exist once someone enters them", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyScriptureCatalogue(tx);

				const structure = await getBookStructure(tx, { slug: "romans" });

				expect(structure).toMatchObject({
					chapters: [],
					chapter: null,
					verses: [],
					selectedVerse: null,
				});
			});
		});

		it("shows a chosen verse, with how each translation treats it", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyScriptureCatalogue(tx);
				await addChapter(tx, "romans", 1, 2);
				const inserted = await addChapter(tx, "romans", 16, 24);
				const verse24 = inserted.find(({ number }) => number === 24);
				const verse23 = inserted.find(({ number }) => number === 23);
				if (!verse24 || !verse23) throw new Error("No verses");
				await tx.insert(versePresence).values([
					{
						verseId: verse24.id,
						translationId: await translationId(tx, "ESV"),
						kind: "omitted_footnote",
					},
					{
						verseId: verse24.id,
						translationId: await translationId(tx, "NLT"),
						kind: "included_in",
						includedInVerseId: verse23.id,
					},
				]);

				const structure = await getBookStructure(tx, {
					slug: "romans",
					chapter: 16,
					verse: 24,
				});

				expect(structure?.chapter).toBe(16);
				expect(structure?.chapters.map((c) => c.differingVerses)).toEqual([
					0, 1,
				]);
				expect(structure?.verses.filter((v) => v.differs)).toHaveLength(1);
				expect(structure?.selectedVerse?.presence).toEqual([
					{ abbreviation: "KJV", kind: "present", includedInVerse: null },
					{ abbreviation: "NKJV", kind: "present", includedInVerse: null },
					{
						abbreviation: "ESV",
						kind: "omitted_footnote",
						includedInVerse: null,
					},
					{ abbreviation: "NIV", kind: "present", includedInVerse: null },
					{ abbreviation: "NLT", kind: "included_in", includedInVerse: 23 },
					{ abbreviation: "NASB", kind: "present", includedInVerse: null },
				]);
				expect((await getScriptureBook(tx, "romans"))?.differingVerses).toBe(1);
			});
		});

		it("falls back to the first chapter and verse", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyScriptureCatalogue(tx);
				await addChapter(tx, "romans", 1, 2);

				const structure = await getBookStructure(tx, {
					slug: "romans",
					chapter: 99,
					verse: 99,
				});

				expect(structure?.chapter).toBe(1);
				expect(structure?.selectedVerse?.number).toBe(1);
			});
		});

		it("counts content on passages covering the verse, across chapters", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { versificationId } = await applyScriptureCatalogue(tx);
				const first = await addChapter(tx, "romans", 1, 3);
				const second = await addChapter(tx, "romans", 2, 3);
				const [startVerse, endVerse] = [first[1], second[1]];
				if (!startVerse || !endVerse) throw new Error("No verses");
				const [passage] = await tx
					.insert(passages)
					.values({
						bookId: await bookId(tx, "romans"),
						title: "Romans 1:2 to 2:2",
					})
					.returning({ id: passages.id });
				if (!passage) throw new Error("No passage");
				await tx.insert(passageRanges).values({
					passageId: passage.id,
					versificationSystemId: versificationId,
					startVerseId: startVerse.id,
					endVerseId: endVerse.id,
				});
				await tx
					.insert(commentaries)
					.values({ passageId: passage.id, content: "Commentary" });
				const linkedAt = async (chapter: number, verse: number) =>
					(await getBookStructure(tx, { slug: "romans", chapter, verse }))
						?.selectedVerse?.linked.commentary;

				expect(await linkedAt(1, 1)).toBe(0);
				expect(await linkedAt(1, 3)).toBe(1);
				expect(await linkedAt(2, 2)).toBe(1);
				expect(await linkedAt(2, 3)).toBe(0);
			});
		});
	});

	describe("book records", () => {
		it("saves changes and records them", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				await applyScriptureCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");

				await updateBookRecord(tx, {
					...record,
					aliases: [" Rom ", "rom", "Rmn"],
					actorUserId: superadmin.id,
					slug: "romans",
				});

				const romans = await getScriptureBook(tx, "romans");
				expect(romans?.fullTitle).toBe("The Epistle to the Romans");
				expect(romans?.aliases).toHaveLength(2);
			});
		});

		it("refuses an alias that already points to another book", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				await applyScriptureCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");

				await expect(
					updateBookRecord(tx, {
						...record,
						aliases: ["GN"],
						actorUserId: superadmin.id,
						slug: "romans",
					}),
				).rejects.toThrow("already points to Genesis");
			});
		});

		it("refuses a name another book has", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				await applyScriptureCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");

				await expect(
					updateBookRecord(tx, {
						...record,
						name: "Genesis",
						actorUserId: superadmin.id,
						slug: "romans",
					}),
				).rejects.toThrow("already called Genesis");
			});
		});

		it("passes suggestions to the people who can act on them", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				await applyScriptureCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				const contributor = await createPerson(tx, "Contributor");

				await suggestBookChange(tx, {
					actorUserId: contributor.id,
					slug: "romans",
					suggestion: "Add Rms as an abbreviation",
				});

				const received = await tx
					.select({ body: notifications.body })
					.from(notifications)
					.where(eq(notifications.userId, superadmin.id));
				expect(received).toEqual([{ body: "Add Rms as an abbreviation" }]);
			});
		});
	});

	describe("translations", () => {
		it("lists the six in order, and falls back to the first", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyScriptureCatalogue(tx);

				const overview = await getTranslationsOverview(tx, "nonsense");

				expect(overview.list.map((t) => t.abbreviation)).toEqual([
					"KJV",
					"NKJV",
					"ESV",
					"NIV",
					"NLT",
					"NASB",
				]);
				expect(overview.selected?.abbreviation).toBe("KJV");
				expect(overview.selected?.books).toHaveLength(66);
				expect(overview.selected?.books[0]?.state).toBe("not_started");
			});
		});

		it("starts with blank rights details, and only licensed ones blocked", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyScriptureCatalogue(tx);

				const kjv = (await getTranslationsOverview(tx, "KJV")).selected;
				const niv = (await getTranslationsOverview(tx, "NIV")).selected;

				expect(kjv?.publishingBlock).toBeNull();
				expect(niv).toMatchObject({
					name: "New International Version",
					rightsHolder: null,
					copyrightNotice: null,
					publishingBlock: "permission_not_recorded",
				});
			});
		});

		it("measures progress from published verses", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyScriptureCatalogue(tx);
				const verseRows = await addChapter(tx, "jude", 1, 25);
				const kjvId = await translationId(tx, "KJV");
				await tx.insert(verseTexts).values(
					verseRows.map(({ id }) => ({
						translationId: kjvId,
						verseId: id,
						text: "Text",
					})),
				);
				const [partial] = await addChapter(tx, "obadiah", 1, 21);
				if (!partial) throw new Error("No verse");
				await tx
					.insert(verseTexts)
					.values({ translationId: kjvId, verseId: partial.id, text: "Text" });

				const overview = await getTranslationsOverview(tx, "KJV");
				const stateOf = (slug: string) =>
					overview.selected?.books.find((book) => book.slug === slug)?.state;

				expect(stateOf("jude")).toBe("published");
				expect(stateOf("obadiah")).toBe("entering");
				expect(stateOf("romans")).toBe("not_started");
				expect(overview.list[0]?.publishedVerses).toBe(26);
				expect(overview.list[0]?.publishedShare).toBeCloseTo(26 / 31102);
				expect(overview.list[1]?.publishedVerses).toBe(0);
			});
		});

		it("records details and permission, which unblocks publishing", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				await applyScriptureCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");

				await updateTranslationDetails(tx, {
					actorUserId: superadmin.id,
					abbreviation: "NIV",
					name: "New International Version",
					edition: "2011",
					rightsHolder: "",
					copyrightNotice: "",
				});
				await recordTranslationPermission(tx, {
					actorUserId: superadmin.id,
					abbreviation: "NIV",
					rightsHolder: "Biblica",
					copyrightNotice: "Used by permission.",
					licenceEndsOn: "2099-12-31",
					quotationLimits: "500 verses",
					reason: "Licence letter 123",
				});

				const niv = (await getTranslationsOverview(tx, "NIV")).selected;
				expect(niv).toMatchObject({
					edition: "2011",
					rightsHolder: "Biblica",
					licenceEndsOn: "2099-12-31",
					publishingBlock: null,
				});

				await removeTranslationPermission(tx, {
					actorUserId: superadmin.id,
					abbreviation: "NIV",
					reason: "Recorded by mistake",
				});
				expect(
					(await getTranslationsOverview(tx, "NIV")).selected?.publishingBlock,
				).toBe("permission_not_recorded");
			});
		});

		it("won't blank the details a recorded permission depends on", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				await applyScriptureCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				await recordTranslationPermission(tx, {
					actorUserId: superadmin.id,
					abbreviation: "NIV",
					rightsHolder: "Biblica",
					copyrightNotice: "Used by permission.",
					licenceEndsOn: null,
					quotationLimits: "",
					reason: "Letter",
				});

				await expect(
					updateTranslationDetails(tx, {
						actorUserId: superadmin.id,
						abbreviation: "NIV",
						name: "New International Version",
						edition: "2011",
						rightsHolder: "",
						copyrightNotice: "",
					}),
				).rejects.toThrow("can't be blank");

				await removeTranslationPermission(tx, {
					actorUserId: superadmin.id,
					abbreviation: "NIV",
					reason: "Withdrawn",
				});
				await updateTranslationDetails(tx, {
					actorUserId: superadmin.id,
					abbreviation: "NIV",
					name: "New International Version",
					edition: "2011",
					rightsHolder: "",
					copyrightNotice: "",
				});
				expect(
					(await getTranslationsOverview(tx, "NIV")).selected?.rightsHolder,
				).toBeNull();
			});
		});

		it("needs a rights holder, a notice and a reference to record permission", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				await applyScriptureCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				const base = {
					actorUserId: superadmin.id,
					abbreviation: "NIV",
					rightsHolder: "Biblica",
					copyrightNotice: "Used by permission.",
					licenceEndsOn: null,
					quotationLimits: "",
					reason: "Letter",
				};

				await expect(
					recordTranslationPermission(tx, { ...base, rightsHolder: " " }),
				).rejects.toThrow("Name the rights holder");
				await expect(
					recordTranslationPermission(tx, { ...base, copyrightNotice: "" }),
				).rejects.toThrow("copyright notice");
				await expect(
					recordTranslationPermission(tx, { ...base, reason: "" }),
				).rejects.toThrow("permission is recorded");
			});
		});

		it("doesn't take a permission for the KJV, or edit other translations", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				await applyScriptureCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");

				await expect(
					recordTranslationPermission(tx, {
						actorUserId: superadmin.id,
						abbreviation: "KJV",
						rightsHolder: "Crown",
						copyrightNotice: "Notice",
						licenceEndsOn: null,
						quotationLimits: "",
						reason: "Letter",
					}),
				).rejects.toThrow("doesn't need permission");
				await expect(
					updateTranslationDetails(tx, {
						actorUserId: superadmin.id,
						abbreviation: "MSG",
						name: "The Message",
						edition: "",
						rightsHolder: "",
						copyrightNotice: "",
					}),
				).rejects.toThrow("isn't supported");
			});
		});

		it("blocks publishing once a licence has ended", () => {
			const recorded = new Date("2026-01-01");
			expect(
				publishingBlock(
					{
						licensed: true,
						permissionRecordedAt: recorded,
						licenceEndsOn: "2026-06-30",
					},
					"2026-07-01",
				),
			).toBe("licence_ended");
			expect(
				publishingBlock(
					{
						licensed: true,
						permissionRecordedAt: recorded,
						licenceEndsOn: "2026-06-30",
					},
					"2026-06-30",
				),
			).toBeNull();
			expect(
				publishingBlock(
					{ licensed: false, permissionRecordedAt: null, licenceEndsOn: null },
					"2026-07-01",
				),
			).toBeNull();
		});
	});
});
