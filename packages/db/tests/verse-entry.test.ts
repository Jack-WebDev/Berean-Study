import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import type { DbExecutor } from "../src/db-executor";
import { auditLog } from "../src/schema/audit_log";
import { books } from "../src/schema/books";
import { chapters } from "../src/schema/chapters";
import { notifications } from "../src/schema/notifications";
import { translations } from "../src/schema/translations";
import { versePresence } from "../src/schema/verse_presence";
import { verseTextRevisions } from "../src/schema/verse_text_revisions";
import { verseTexts } from "../src/schema/verse_texts";
import { verses } from "../src/schema/verses";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import { getStaffQueueCounts } from "../src/staff-queues";
import {
	getTranslationsOverview,
	recordTranslationPermission,
} from "../src/translations-admin";
import {
	addChapter,
	addVerse,
	getEntryChapter,
	getVerseAcrossTranslations,
	proposeVerseCorrection,
	removeLastChapter,
	removeLastVerse,
	saveVerseDrafts,
	sendChapterForProofreading,
} from "../src/verse-entry";
import {
	getProofreadingChapter,
	listChaptersReadyToPublish,
	listProofreadingQueue,
	markVerse,
	passChapter,
	publishChapter,
	reopenChapter,
	sendBackVerses,
} from "../src/verse-proofreading";
import {
	createPerson,
	inRolledBackTransactionWithoutScripture,
	withFreshCatalogue,
} from "./governance-helpers";

const kjvRomans1 = { abbreviation: "KJV", chapter: 1, slug: "romans" };
const nivRomans1 = { ...kjvRomans1, abbreviation: "NIV" };

async function setUp(tx: DbExecutor) {
	await withFreshCatalogue(tx);
	await applyScriptureCatalogue(tx);
	const enterer = await createPerson(tx, "Contributor");
	const proofreader = await createPerson(tx, "Contributor");
	const admin = await createPerson(tx, "Admin");
	await addChapter(tx, {
		abbreviation: "KJV",
		actorUserId: enterer.id,
		slug: "romans",
	});
	return { admin, enterer, proofreader };
}

/** Enters verses as drafts, adding them to the chapter as pasting does. */
async function enter(
	tx: DbExecutor,
	actorUserId: string,
	address: typeof kjvRomans1,
	wording: Record<number, string>,
) {
	await saveVerseDrafts(tx, {
		...address,
		actorUserId,
		addMissingVerses: true,
		verses: Object.entries(wording).map(([number, text]) => ({
			baseText: "",
			number: Number(number),
			text,
		})),
	});
}

async function enterAndSubmit(
	tx: DbExecutor,
	actorUserId: string,
	address: typeof kjvRomans1,
	wording: Record<number, string>,
) {
	await enter(tx, actorUserId, address, wording);
	await sendChapterForProofreading(tx, { ...address, actorUserId });
}

async function markAll(
	tx: DbExecutor,
	actorUserId: string,
	address: typeof kjvRomans1,
	numbers: number[],
) {
	for (const verse of numbers) {
		await markVerse(tx, {
			...address,
			actorUserId,
			result: { mark: "matches" },
			verse,
		});
	}
}

async function publishedText(
	tx: DbExecutor,
	abbreviation: string,
	verseNumber: number,
) {
	const rows = await tx
		.select({ text: verseTexts.text })
		.from(verseTexts)
		.innerJoin(translations, eq(translations.id, verseTexts.translationId))
		.innerJoin(verses, eq(verses.id, verseTexts.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(books, eq(books.id, chapters.bookId))
		.where(
			and(
				eq(translations.abbreviation, abbreviation),
				eq(books.slug, "romans"),
				eq(chapters.number, 1),
				eq(verses.number, verseNumber),
			),
		);
	return rows[0]?.text ?? null;
}

async function actionsRecorded(tx: DbExecutor, action: string) {
	return tx.select().from(auditLog).where(eq(auditLog.action, action));
}

async function entryRow(
	tx: DbExecutor,
	viewerUserId: string,
	address: typeof kjvRomans1,
	number: number,
) {
	const entry = await getEntryChapter(tx, address, viewerUserId);
	return entry?.verses.find((row) => row.number === number);
}

/** A published Romans 1:1-2 in KJV, for tests about what happens afterwards. */
async function publishTwoVerses(
	tx: DbExecutor,
	people: Awaited<ReturnType<typeof setUp>>,
) {
	await enterAndSubmit(tx, people.enterer.id, kjvRomans1, {
		1: "Paul, a servant.",
		2: "Which he had promised.",
	});
	await markAll(tx, people.proofreader.id, kjvRomans1, [1, 2]);
	await passChapter(tx, {
		...kjvRomans1,
		actorUserId: people.proofreader.id,
		publish: false,
	});
	await publishChapter(tx, { ...kjvRomans1, actorUserId: people.admin.id });
}

afterAll(async () => {
	await pool.end();
});

describe("entering Scripture", () => {
	it("creates verses from a paste and shows them as drafts", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await enter(tx, enterer.id, kjvRomans1, {
				1: "Paul, a servant.",
				2: "Which he had promised.",
			});

			const entry = await getEntryChapter(tx, kjvRomans1, enterer.id);
			expect(
				entry?.verses.map(({ number, status }) => [number, status]),
			).toEqual([
				[1, "draft"],
				[2, "draft"],
			]);
			expect(entry?.nextVerse).toBe(3);
			expect(
				entry?.translations.find(({ abbreviation }) => abbreviation === "KJV"),
			).toEqual({ abbreviation: "KJV", entered: 2, total: 2 });
			expect(
				entry?.translations.find(({ abbreviation }) => abbreviation === "NIV"),
			).toEqual({ abbreviation: "NIV", entered: 0, total: 2 });
		});
	});

	it("never shows drafts to readers", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			expect(await publishedText(tx, "KJV", 1)).toBeNull();
		});
	});

	it("clears a draft when its text is blanked", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await enter(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await saveVerseDrafts(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
				verses: [{ baseText: "Paul.", number: 1, text: "   " }],
			});
			const row = await entryRow(tx, enterer.id, kjvRomans1, 1);
			expect(row?.status).toBe("empty");
		});
	});

	it("won't overwrite wording someone else has changed", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enter(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await saveVerseDrafts(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				verses: [{ baseText: "Paul.", number: 1, text: "Paul, a servant." }],
			});
			await expect(
				saveVerseDrafts(tx, {
					...kjvRomans1,
					actorUserId: enterer.id,
					verses: [{ baseText: "Paul.", number: 1, text: "Paul, an apostle." }],
				}),
			).rejects.toThrow("Someone else has changed verse 1");
		});
	});

	it("records no audit entry for each autosave, only when sent", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			const before = (await actionsRecorded(tx, "verse_text.entered")).length;
			await enter(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			expect((await actionsRecorded(tx, "verse_text.entered")).length).toBe(
				before,
			);
			await sendChapterForProofreading(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
			});
			expect((await actionsRecorded(tx, "verse_text.entered")).length).toBe(
				before + 1,
			);
		});
	});

	it("locks text once it's with a proofreader", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await expect(
				saveVerseDrafts(tx, {
					...kjvRomans1,
					actorUserId: enterer.id,
					verses: [{ baseText: "Paul.", number: 1, text: "Changed." }],
				}),
			).rejects.toThrow("with the proofreader");
		});
	});

	it("won't send a chapter with no drafts", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await expect(
				sendChapterForProofreading(tx, {
					...kjvRomans1,
					actorUserId: enterer.id,
				}),
			).rejects.toThrow("no drafts");
		});
	});

	it("adds verses and chapters only at the end", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await addVerse(tx, { ...kjvRomans1, actorUserId: enterer.id });
			await addVerse(tx, { ...kjvRomans1, actorUserId: enterer.id });
			const entry = await getEntryChapter(tx, kjvRomans1, enterer.id);
			expect(entry?.verses.map(({ number }) => number)).toEqual([1, 2]);

			const next = await addChapter(tx, {
				abbreviation: "KJV",
				actorUserId: enterer.id,
				slug: "romans",
			});
			expect(next.number).toBe(2);
		});
	});

	it("won't add a chapter past the book's length", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			const add = () =>
				addChapter(tx, {
					abbreviation: "KJV",
					actorUserId: enterer.id,
					slug: "romans",
				});
			for (let chapter = 2; chapter <= 16; chapter += 1) await add();
			await expect(add()).rejects.toThrow("second Superadmin");
		});
	});

	it("refuses an impossible verse number from a paste", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await expect(
				enter(tx, enterer.id, kjvRomans1, { 177: "Too far." }),
			).rejects.toThrow("can't be right");
		});
	});

	it("takes back an unused verse or chapter, but nothing in use", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await addVerse(tx, { ...kjvRomans1, actorUserId: enterer.id });
			await enter(tx, enterer.id, kjvRomans1, { 2: "Which he promised." });
			await addVerse(tx, { ...kjvRomans1, actorUserId: enterer.id });

			await expect(
				removeLastVerse(tx, {
					...kjvRomans1,
					actorUserId: enterer.id,
					verse: 1,
				}),
			).rejects.toThrow("Only the last verse");

			await removeLastVerse(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
				verse: 3,
			});
			await expect(
				removeLastVerse(tx, {
					...kjvRomans1,
					actorUserId: enterer.id,
					verse: 2,
				}),
			).rejects.toThrow("already has text");
			await expect(
				removeLastChapter(tx, { ...kjvRomans1, actorUserId: enterer.id }),
			).rejects.toThrow("has verses");

			await addChapter(tx, {
				abbreviation: "KJV",
				actorUserId: enterer.id,
				slug: "romans",
			});
			await removeLastChapter(tx, {
				...kjvRomans1,
				chapter: 2,
				actorUserId: enterer.id,
			});
			const entry = await getEntryChapter(tx, kjvRomans1, enterer.id);
			expect(entry?.chapters.map(({ number }) => number)).toEqual([1]);
		});
	});
});

describe("proofreading", () => {
	it("won't let anyone proofread a verse they entered", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await expect(markAll(tx, enterer.id, kjvRomans1, [1])).rejects.toThrow(
				"someone else has to proofread",
			);
		});
	});

	it("is also refused by the database, whatever the code does", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await expect(
				tx.transaction((attempt) =>
					attempt
						.update(verseTextRevisions)
						.set({
							proofMark: "matches",
							proofreadAt: new Date(),
							proofreadByUserId: enterer.id,
						})
						.where(eq(verseTextRevisions.enteredByUserId, enterer.id)),
				),
			).rejects.toThrow();
		});
	});

	it("treats whoever last changed a draft as the one who entered it", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enter(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await saveVerseDrafts(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				verses: [{ baseText: "Paul.", number: 1, text: "Paul, a servant." }],
			});
			await sendChapterForProofreading(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
			});
			await expect(
				markAll(tx, proofreader.id, kjvRomans1, [1]),
			).rejects.toThrow("someone else has to proofread");
			await markAll(tx, enterer.id, kjvRomans1, [1]);
		});
	});

	it("keeps marks between sittings and counts progress", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, {
				1: "Paul.",
				2: "Which.",
				3: "Concerning.",
			});
			await markAll(tx, proofreader.id, kjvRomans1, [1]);
			await markVerse(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				result: { mark: "needs_fix", note: "Check this", suggestedText: "" },
				verse: 2,
			});

			const chapter = await getProofreadingChapter(
				tx,
				kjvRomans1,
				proofreader.id,
			);
			expect(chapter.progress).toEqual({ checked: 2, needFix: 1, total: 3 });
			expect(chapter.viewerHasChecked).toBe(true);
			expect(chapter.enterers).toEqual(["Test Person"]);
		});
	});

	it("needs a correction or a note to mark a fix", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await expect(
				markVerse(tx, {
					...kjvRomans1,
					actorUserId: proofreader.id,
					result: { mark: "needs_fix", note: " ", suggestedText: "Paul." },
					verse: 1,
				}),
			).rejects.toThrow("corrected wording or add a note");
		});
	});

	it("won't pass a chapter with unchecked verses or fixes", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, {
				1: "Paul.",
				2: "Which.",
			});
			await markAll(tx, proofreader.id, kjvRomans1, [1]);
			const pass = () =>
				passChapter(tx, {
					...kjvRomans1,
					actorUserId: proofreader.id,
					publish: false,
				});
			await expect(pass()).rejects.toThrow("Verses 2 haven't been checked");

			await markVerse(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				result: { mark: "needs_fix", note: "Typo", suggestedText: "" },
				verse: 2,
			});
			await expect(pass()).rejects.toThrow("Send them back");
		});
	});

	it("won't let the person who entered everything pass it on someone's checks", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await markAll(tx, proofreader.id, kjvRomans1, [1]);
			await expect(
				passChapter(tx, {
					...kjvRomans1,
					actorUserId: enterer.id,
					publish: false,
				}),
			).rejects.toThrow("Check at least one verse yourself");
		});
	});

	it("lets two people check each other's verses in one chapter", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enter(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await enter(tx, proofreader.id, kjvRomans1, { 2: "Which." });
			await sendChapterForProofreading(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
			});
			await markAll(tx, proofreader.id, kjvRomans1, [1]);
			await markAll(tx, enterer.id, kjvRomans1, [2]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
				publish: false,
			});
			const [row] = await listChaptersReadyToPublish(tx);
			expect(row?.passedVerses).toBe(2);
		});
	});

	it("sends only fixes back, with the correction, and tells the enterer", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, {
				1: "33 Paul.",
				2: "Which.",
			});
			await markVerse(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				result: {
					mark: "needs_fix",
					note: "Verse number was pasted in",
					suggestedText: "Paul.",
				},
				verse: 1,
			});
			await markAll(tx, proofreader.id, kjvRomans1, [2]);
			await sendBackVerses(tx, { ...kjvRomans1, actorUserId: proofreader.id });

			const row = await entryRow(tx, enterer.id, kjvRomans1, 1);
			expect(row?.status).toBe("needs_fix");
			expect(row?.suggestedText).toBe("Paul.");
			expect(row?.proofNote).toBe("Verse number was pasted in");
			expect(row?.returnedByName).toBe("Test Person");

			const other = await entryRow(tx, enterer.id, kjvRomans1, 2);
			expect(other?.status).toBe("submitted");

			const sent = await tx
				.select()
				.from(notifications)
				.where(eq(notifications.userId, enterer.id));
			expect(sent).toHaveLength(1);
			expect(sent[0]?.destination).toBe(
				"/work/scripture?book=romans&chapter=1&t=KJV",
			);
		});
	});

	it("lets the fixed verse be sent and checked again, keeping the rest", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, {
				1: "33 Paul.",
				2: "Which.",
			});
			await markVerse(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				result: { mark: "needs_fix", note: "", suggestedText: "Paul." },
				verse: 1,
			});
			await markAll(tx, proofreader.id, kjvRomans1, [2]);
			await sendBackVerses(tx, { ...kjvRomans1, actorUserId: proofreader.id });

			await saveVerseDrafts(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
				verses: [{ baseText: "33 Paul.", number: 1, text: "Paul." }],
			});
			await sendChapterForProofreading(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
			});

			const chapter = await getProofreadingChapter(
				tx,
				kjvRomans1,
				proofreader.id,
			);
			expect(chapter.progress).toEqual({ checked: 1, needFix: 0, total: 2 });
			const first = chapter.verses.find(({ number }) => number === 1);
			expect(first?.suggestedText).toBeNull();
			expect(first?.proofNote).toBeNull();

			await markAll(tx, proofreader.id, kjvRomans1, [1]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				publish: false,
			});
		});
	});

	it("lets the enterer keep their wording when the check was wrong", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await markVerse(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				result: {
					mark: "needs_fix",
					note: "Is this right?",
					suggestedText: "",
				},
				verse: 1,
			});
			await sendBackVerses(tx, { ...kjvRomans1, actorUserId: proofreader.id });
			await saveVerseDrafts(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				verses: [{ baseText: "Paul.", number: 1, text: "Paul." }],
			});

			const row = await entryRow(tx, enterer.id, kjvRomans1, 1);
			expect(row?.status).toBe("draft");
			expect(row?.enteredByMe).toBe(true);
			expect(row?.proofNote).toBe("Is this right?");
		});
	});
});

describe("publishing", () => {
	it("publishes passed text for readers and keeps both names", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await publishTwoVerses(tx, people);

			expect(await publishedText(tx, "KJV", 1)).toBe("Paul, a servant.");
			const rows = await tx
				.select()
				.from(verseTextRevisions)
				.where(eq(verseTextRevisions.enteredByUserId, people.enterer.id));
			expect(rows).toHaveLength(2);
			for (const row of rows) {
				expect(row.status).toBe("published");
				expect(row.proofreadByUserId).toBe(people.proofreader.id);
				expect(row.publishedByUserId).toBe(people.admin.id);
			}

			const [entry] = (await actionsRecorded(tx, "verse_text.published")).slice(
				-1,
			);
			expect(entry?.actorUserId).toBe(people.admin.id);
			expect(entry?.details).toMatchObject({
				name: "Romans 1 · KJV",
				revisionIds: rows.map(({ id }) => id),
				verses: [1, 2],
			});
		});
	});

	it("can pass and publish in one step", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { admin, enterer } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await markAll(tx, admin.id, kjvRomans1, [1]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: admin.id,
				publish: true,
			});
			expect(await publishedText(tx, "KJV", 1)).toBe("Paul.");
		});
	});

	it("blocks a licensed chapter until permission is recorded, but allows entry and proofreading", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { admin, enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, nivRomans1, { 1: "Paul." });
			await markAll(tx, proofreader.id, nivRomans1, [1]);
			await passChapter(tx, {
				...nivRomans1,
				actorUserId: proofreader.id,
				publish: false,
			});

			await expect(
				publishChapter(tx, { ...nivRomans1, actorUserId: admin.id }),
			).rejects.toThrow("permission is recorded");
			expect(await publishedText(tx, "NIV", 1)).toBeNull();

			const [ready] = await listChaptersReadyToPublish(tx);
			expect(ready?.publishingBlock).toBe("permission_not_recorded");

			await recordTranslationPermission(tx, {
				abbreviation: "NIV",
				actorUserId: admin.id,
				copyrightNotice: "Notice",
				licenceEndsOn: null,
				quotationLimits: "",
				reason: "Letter 1",
				rightsHolder: "Biblica",
			});
			await publishChapter(tx, { ...nivRomans1, actorUserId: admin.id });
			expect(await publishedText(tx, "NIV", 1)).toBe("Paul.");
		});
	});

	it("rolls back the pass if pass-and-publish can't publish", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { admin, enterer } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, nivRomans1, { 1: "Paul." });
			await markAll(tx, admin.id, nivRomans1, [1]);
			await expect(
				passChapter(tx, {
					...nivRomans1,
					actorUserId: admin.id,
					publish: true,
				}),
			).rejects.toThrow("permission is recorded");
			const row = await entryRow(tx, admin.id, nivRomans1, 1);
			expect(row?.status).toBe("submitted");
		});
	});

	it("won't publish a chapter with verses still missing", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { admin, enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await addVerse(tx, { ...kjvRomans1, actorUserId: enterer.id });
			await markAll(tx, proofreader.id, kjvRomans1, [1]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				publish: false,
			});

			await expect(
				publishChapter(tx, { ...kjvRomans1, actorUserId: admin.id }),
			).rejects.toThrow("verses 2 haven't passed");
		});
	});

	it("doesn't wait for a verse that translation doesn't have", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { admin, enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			await addVerse(tx, { ...kjvRomans1, actorUserId: enterer.id });
			await markAll(tx, proofreader.id, kjvRomans1, [1]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				publish: false,
			});

			const entry = await getEntryChapter(tx, kjvRomans1, enterer.id);
			const [verse] = await tx
				.select({ id: verses.id })
				.from(verses)
				.innerJoin(chapters, eq(chapters.id, verses.chapterId))
				.innerJoin(books, eq(books.id, chapters.bookId))
				.where(
					and(
						eq(books.slug, "romans"),
						eq(chapters.number, 1),
						eq(verses.number, 2),
					),
				);
			const [kjv] = await tx
				.select({ id: translations.id })
				.from(translations)
				.where(eq(translations.abbreviation, "KJV"));
			if (!verse || !kjv || !entry) throw new Error("Missing test data");
			await tx.insert(versePresence).values({
				kind: "not_in_translation",
				translationId: kjv.id,
				verseId: verse.id,
			});

			await publishChapter(tx, { ...kjvRomans1, actorUserId: admin.id });
			expect(await publishedText(tx, "KJV", 1)).toBe("Paul.");

			await expect(
				saveVerseDrafts(tx, {
					...kjvRomans1,
					actorUserId: enterer.id,
					verses: [{ baseText: "", number: 2, text: "Added." }],
				}),
			).rejects.toThrow("no text of its own");
		});
	});
});

describe("sending a passed chapter back", () => {
	async function passTwoVerses(
		tx: DbExecutor,
		people: Awaited<ReturnType<typeof setUp>>,
	) {
		await enterAndSubmit(tx, people.enterer.id, kjvRomans1, {
			1: "Paul, a servant.",
			2: "Wrong wording.",
		});
		await markAll(tx, people.proofreader.id, kjvRomans1, [1, 2]);
		await passChapter(tx, {
			...kjvRomans1,
			actorUserId: people.proofreader.id,
			publish: false,
		});
	}

	it("stops a wrongly passed chapter going live, and lets the wrong verse be fixed", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await passTwoVerses(tx, people);

			await reopenChapter(tx, {
				...kjvRomans1,
				actorUserId: people.admin.id,
				reason: "Verse 2 doesn't match the printed text",
			});

			expect(await listChaptersReadyToPublish(tx)).toEqual([]);
			await expect(
				publishChapter(tx, { ...kjvRomans1, actorUserId: people.admin.id }),
			).rejects.toThrow("Nothing in this chapter has passed");
			expect(await publishedText(tx, "KJV", 2)).toBeNull();

			await markVerse(tx, {
				...kjvRomans1,
				actorUserId: people.admin.id,
				result: {
					mark: "needs_fix",
					note: "Doesn't match",
					suggestedText: "Which he had promised.",
				},
				verse: 2,
			});
			await sendBackVerses(tx, { ...kjvRomans1, actorUserId: people.admin.id });
			await saveVerseDrafts(tx, {
				...kjvRomans1,
				actorUserId: people.enterer.id,
				verses: [
					{
						baseText: "Wrong wording.",
						number: 2,
						text: "Which he had promised.",
					},
				],
			});
			await sendChapterForProofreading(tx, {
				...kjvRomans1,
				actorUserId: people.enterer.id,
			});
			await markAll(tx, people.admin.id, kjvRomans1, [2]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: people.admin.id,
				publish: true,
			});

			expect(await publishedText(tx, "KJV", 2)).toBe("Which he had promised.");
		});
	});

	it("keeps the marks, so only what's wrong has to change", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await passTwoVerses(tx, people);
			await reopenChapter(tx, {
				...kjvRomans1,
				actorUserId: people.proofreader.id,
				reason: "I marked verse 2 by mistake",
			});

			const chapter = await getProofreadingChapter(
				tx,
				kjvRomans1,
				people.proofreader.id,
			);
			expect(chapter.progress).toEqual({ checked: 2, needFix: 0, total: 2 });
			expect(chapter.passedVerses).toBe(0);
		});
	});

	it("records why, and tells whoever passed it", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await passTwoVerses(tx, people);
			await reopenChapter(tx, {
				...kjvRomans1,
				actorUserId: people.admin.id,
				reason: "Verse 2 is wrong",
			});

			const [entry] = (await actionsRecorded(tx, "verse_text.reopened")).slice(
				-1,
			);
			expect(entry?.actorUserId).toBe(people.admin.id);
			expect(entry?.details).toMatchObject({
				name: "Romans 1 · KJV",
				reason: "Verse 2 is wrong",
				verses: [1, 2],
			});

			const [sent] = await tx
				.select()
				.from(notifications)
				.where(eq(notifications.userId, people.proofreader.id));
			expect(sent?.body).toBe("Verse 2 is wrong");
			expect(sent?.destination).toBe(
				"/work/scripture/proofreading/KJV/romans/1",
			);
		});
	});

	it("needs a reason, and something to send back", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			const reopen = (reason: string) =>
				reopenChapter(tx, {
					...kjvRomans1,
					actorUserId: people.admin.id,
					reason,
				});

			await expect(reopen("Reason")).rejects.toThrow(
				"Nothing in this chapter is waiting",
			);
			await passTwoVerses(tx, people);
			await expect(reopen("  ")).rejects.toThrow("Say why");
		});
	});

	it("leaves published verses alone", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await publishTwoVerses(tx, people);
			await proposeVerseCorrection(tx, {
				...kjvRomans1,
				actorUserId: people.proofreader.id,
				checkedAgainst: "",
				reason: "Reason",
				text: "New wording.",
				verse: 1,
			});
			await markAll(tx, people.enterer.id, kjvRomans1, [1]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: people.enterer.id,
				publish: false,
			});

			await reopenChapter(tx, {
				...kjvRomans1,
				actorUserId: people.admin.id,
				reason: "The correction is wrong",
			});

			expect(await publishedText(tx, "KJV", 1)).toBe("Paul, a servant.");
			const row = await entryRow(tx, people.enterer.id, kjvRomans1, 2);
			expect(row?.status).toBe("published");
		});
	});
});

describe("correcting published text", () => {
	it("keeps the current text for readers until the correction is published", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await publishTwoVerses(tx, people);

			await proposeVerseCorrection(tx, {
				...kjvRomans1,
				actorUserId: people.proofreader.id,
				checkedAgainst: "1769 Oxford",
				reason: "Missing words",
				text: "Paul, a servant of Jesus Christ.",
				verse: 1,
			});
			expect(await publishedText(tx, "KJV", 1)).toBe("Paul, a servant.");

			await markAll(tx, people.enterer.id, kjvRomans1, [1]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: people.enterer.id,
				publish: false,
			});
			expect(await publishedText(tx, "KJV", 1)).toBe("Paul, a servant.");

			await publishChapter(tx, {
				...kjvRomans1,
				actorUserId: people.admin.id,
			});
			expect(await publishedText(tx, "KJV", 1)).toBe(
				"Paul, a servant of Jesus Christ.",
			);

			const statuses = await tx
				.select({ status: verseTextRevisions.status })
				.from(verseTextRevisions)
				.innerJoin(verses, eq(verses.id, verseTextRevisions.verseId))
				.where(eq(verses.number, 1));
			expect(statuses.map(({ status }) => status).sort()).toEqual([
				"published",
				"superseded",
			]);
		});
	});

	it("needs a reason and a real change, and only one change at a time", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await publishTwoVerses(tx, people);
			const propose = (text: string, reason: string) =>
				proposeVerseCorrection(tx, {
					...kjvRomans1,
					actorUserId: people.proofreader.id,
					checkedAgainst: "",
					reason,
					text,
					verse: 1,
				});

			await expect(propose("New wording.", " ")).rejects.toThrow("Say why");
			await expect(propose("Paul, a servant.", "Reason")).rejects.toThrow(
				"same as the published",
			);
			await propose("New wording.", "Reason");
			await expect(propose("Other wording.", "Reason")).rejects.toThrow(
				"already has a change in progress",
			);
		});
	});

	it("doesn't let a correction in progress hold up the rest of a chapter", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await publishTwoVerses(tx, people);
			await proposeVerseCorrection(tx, {
				...kjvRomans1,
				actorUserId: people.proofreader.id,
				checkedAgainst: "",
				reason: "Reason",
				text: "New wording.",
				verse: 1,
			});
			await markVerse(tx, {
				...kjvRomans1,
				actorUserId: people.admin.id,
				result: { mark: "needs_fix", note: "Not quite", suggestedText: "" },
				verse: 1,
			});
			await sendBackVerses(tx, { ...kjvRomans1, actorUserId: people.admin.id });

			await enterAndSubmit(tx, people.enterer.id, kjvRomans1, { 3: "New." });
			await markAll(tx, people.admin.id, kjvRomans1, [3]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: people.admin.id,
				publish: true,
			});

			expect(await publishedText(tx, "KJV", 3)).toBe("New.");
			expect(await publishedText(tx, "KJV", 1)).toBe("Paul, a servant.");
		});
	});

	it("refuses to correct what isn't published, or edit published text as a draft", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await enter(tx, people.enterer.id, kjvRomans1, { 1: "Draft." });
			await expect(
				proposeVerseCorrection(tx, {
					...kjvRomans1,
					actorUserId: people.enterer.id,
					checkedAgainst: "",
					reason: "Reason",
					text: "Other.",
					verse: 1,
				}),
			).rejects.toThrow("isn't published");
		});
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await publishTwoVerses(tx, people);
			await expect(
				saveVerseDrafts(tx, {
					...kjvRomans1,
					actorUserId: people.enterer.id,
					verses: [{ baseText: "", number: 1, text: "Changed." }],
				}),
			).rejects.toThrow("Use Correct text");
		});
	});
});

describe("one verse across translations", () => {
	it("shows each translation's state and the verse's history", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const people = await setUp(tx);
			await publishTwoVerses(tx, people);
			await enter(tx, people.enterer.id, nivRomans1, { 1: "Paul." });

			const verse = await getVerseAcrossTranslations(
				tx,
				{ chapter: 1, slug: "romans", verse: 1 },
				people.enterer.id,
			);
			expect(verse?.reference).toBe("Romans 1:1");
			expect(verse?.verseCode).toBe("ROM.1.1");
			expect(verse?.publishedIn).toBe(1);
			expect(verse?.previous).toBeNull();
			expect(verse?.next).toEqual({ chapter: 1, verse: 2 });
			expect(
				verse?.translations.map(({ abbreviation, status }) => [
					abbreviation,
					status,
				]),
			).toEqual([
				["KJV", "published"],
				["NKJV", "empty"],
				["ESV", "empty"],
				["NIV", "draft"],
				["NLT", "empty"],
				["NASB", "empty"],
			]);
			expect(verse?.history.map(({ label }) => label)).toEqual(
				expect.arrayContaining([
					"KJV: entered",
					"KJV: proofread",
					"KJV: published",
					"NIV: entered",
				]),
			);
		});
	});

	it("returns null for a verse that doesn't exist", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer } = await setUp(tx);
			expect(
				await getVerseAcrossTranslations(
					tx,
					{ chapter: 9, slug: "romans", verse: 1 },
					enterer.id,
				),
			).toBeNull();
		});
	});
});

describe("queues and progress", () => {
	it("shows who has work waiting, and never counts your own verses", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { admin, enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, kjvRomans1, {
				1: "Paul.",
				2: "Which.",
			});

			const counts = (userId: string) =>
				getStaffQueueCounts(tx, {
					permissionKeys: ["scripture.enter", "scripture.proofread"],
					userId,
				});
			expect((await counts(enterer.id)).scriptureEntry).toBe(0);
			expect((await counts(proofreader.id)).scriptureEntry).toBe(1);

			const queue = await listProofreadingQueue(tx, proofreader.id);
			expect(queue.waiting).toEqual([
				{
					abbreviation: "KJV",
					bookName: "Romans",
					canCheck: 2,
					chapter: 1,
					checked: 0,
					enterers: ["Test Person"],
					needFix: 0,
					slug: "romans",
					total: 2,
				},
			]);

			await markAll(tx, proofreader.id, kjvRomans1, [1]);
			await markVerse(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				result: { mark: "needs_fix", note: "Typo", suggestedText: "" },
				verse: 2,
			});
			await sendBackVerses(tx, { ...kjvRomans1, actorUserId: proofreader.id });
			expect((await counts(enterer.id)).scriptureEntry).toBe(1);
			expect((await counts(proofreader.id)).scriptureEntry).toBe(0);

			const after = await listProofreadingQueue(tx, enterer.id);
			expect(after.sentBack[0]).toMatchObject({ mine: true, verses: 1 });

			await saveVerseDrafts(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
				verses: [{ baseText: "Which.", number: 2, text: "Which he." }],
			});
			await sendChapterForProofreading(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
			});
			await markAll(tx, proofreader.id, kjvRomans1, [2]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				publish: false,
			});

			const ready = await getStaffQueueCounts(tx, {
				permissionKeys: ["publication.publish"],
				userId: admin.id,
			});
			expect(ready.readyToPublish).toBe(1);
			expect(ready.scriptureEntry).toBeUndefined();
		});
	});

	it("leaves chapters that can't go live out of the ready count", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { admin, enterer, proofreader } = await setUp(tx);
			await enterAndSubmit(tx, enterer.id, nivRomans1, { 1: "Paul." });
			await markAll(tx, proofreader.id, nivRomans1, [1]);
			await passChapter(tx, {
				...nivRomans1,
				actorUserId: proofreader.id,
				publish: false,
			});
			const counts = await getStaffQueueCounts(tx, {
				permissionKeys: ["publication.publish"],
				userId: admin.id,
			});
			expect(counts.readyToPublish).toBe(0);
		});
	});

	it("colours book progress from the real state of the work", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { enterer, proofreader } = await setUp(tx);
			const romansState = async () => {
				const overview = await getTranslationsOverview(tx, "KJV");
				return overview.selected?.books.find(({ slug }) => slug === "romans")
					?.state;
			};

			expect(await romansState()).toBe("not_started");
			await enter(tx, enterer.id, kjvRomans1, { 1: "Paul." });
			expect(await romansState()).toBe("entering");
			await sendChapterForProofreading(tx, {
				...kjvRomans1,
				actorUserId: enterer.id,
			});
			expect(await romansState()).toBe("proofreading");
			await markAll(tx, proofreader.id, kjvRomans1, [1]);
			await passChapter(tx, {
				...kjvRomans1,
				actorUserId: proofreader.id,
				publish: false,
			});
			expect(await romansState()).toBe("proofreading");
		});
	});
});
