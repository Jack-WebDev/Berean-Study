import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { type db, pool } from "../src";
import { listCommunityFeed, publishVersePost } from "../src/community";
import type { DbExecutor } from "../src/db-executor";
import {
	getPassageStart,
	getReaderChapter,
	getReadingPlace,
	getReadingPreferences,
	listAvailableChapters,
	listCanonBooks,
	listHighlightedVerses,
	listNoteMarkers,
	listReaderTranslations,
	listRecentChapters,
	listStudyMarkers,
	passagesForVerses,
	recordChapterVisit,
	saveReadingPlace,
	saveReadingPreferences,
	saveVerses,
	setVersesHighlighted,
	undoHighlightChange,
	unsaveVerses,
} from "../src/reader";
import { bookmarks } from "../src/schema/bookmarks";
import { books } from "../src/schema/books";
import { chapters } from "../src/schema/chapters";
import { communityPostPassages } from "../src/schema/community_post_passages";
import { communityPosts } from "../src/schema/community_posts";
import { contentItems } from "../src/schema/content_items";
import { contentPassages } from "../src/schema/content_passages";
import { contentRevisions } from "../src/schema/content_revisions";
import { highlights } from "../src/schema/highlights";
import { notePassages } from "../src/schema/note_passages";
import { notes } from "../src/schema/notes";
import { postingRestrictions } from "../src/schema/posting_restrictions";
import { readingHistory } from "../src/schema/reading_history";
import { translations } from "../src/schema/translations";
import { versePresence } from "../src/schema/verse_presence";
import { verseTexts } from "../src/schema/verse_texts";
import { verses } from "../src/schema/verses";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import {
	createAccount,
	inRolledBackTransactionWithoutScripture,
} from "./governance-helpers";

afterAll(async () => {
	await pool.end();
});

const romans8 = {
	28: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
	29: "For whom he did foreknow, he also did predestinate to be conformed to the image of his Son, that he might be the firstborn among many brethren.",
	30: "Moreover whom he did predestinate, them he also called: and whom he called, them he also justified: and whom he justified, them he also glorified.",
	31: "What shall we then say to these things? If God be for us, who can be against us?",
	33: "Who shall lay any thing to the charge of God’s elect? It is God that justifieth.",
};

/** Publishes verses of one chapter directly, the way they look once proofread and published. */
async function publish(
	tx: DbExecutor,
	bookSlug: string,
	chapterNumber: number,
	texts: Record<number, string | null>,
	abbreviation = "KJV",
) {
	const [translation] = await tx
		.select({
			id: translations.id,
			versificationSystemId: translations.versificationSystemId,
		})
		.from(translations)
		.where(eq(translations.abbreviation, abbreviation));
	const [book] = await tx
		.select({ id: books.id })
		.from(books)
		.where(eq(books.slug, bookSlug));
	if (!translation || !book) throw new Error("Missing catalogue rows.");

	const [existing] = await tx
		.select({ id: chapters.id })
		.from(chapters)
		.where(
			and(
				eq(chapters.bookId, book.id),
				eq(chapters.number, chapterNumber),
				eq(chapters.versificationSystemId, translation.versificationSystemId),
			),
		);
	const chapter =
		existing ??
		(
			await tx
				.insert(chapters)
				.values({
					bookId: book.id,
					number: chapterNumber,
					versificationSystemId: translation.versificationSystemId,
				})
				.returning({ id: chapters.id })
		)[0];
	if (!chapter) throw new Error("Could not add the chapter.");

	const verseIds = new Map<number, number>();
	for (const [number, text] of Object.entries(texts)) {
		const [verse] = await tx
			.insert(verses)
			.values({ chapterId: chapter.id, number: Number(number) })
			.onConflictDoUpdate({
				set: { number: Number(number) },
				target: [verses.chapterId, verses.number],
			})
			.returning({ id: verses.id });
		if (!verse) throw new Error("Could not add a verse.");
		verseIds.set(Number(number), verse.id);
		if (text !== null) {
			await tx
				.insert(verseTexts)
				.values({ text, translationId: translation.id, verseId: verse.id });
		}
	}
	return { bookId: book.id, translationId: translation.id, verseIds };
}

function inReader(test: (tx: DbExecutor, userId: string) => Promise<void>) {
	return inRolledBackTransactionWithoutScripture(async (tx) => {
		await applyScriptureCatalogue(tx);
		const { id } = await createAccount(tx);
		await test(tx, id);
	});
}

const romans = (chapter: number, translations: string[] = []) => ({
	bookSlug: "romans",
	chapter,
	traditionSlug: null,
	translationAbbreviations: translations,
});

describe("reader chapters", () => {
	it("returns a published chapter in order, with the chapters either side", async () => {
		await inReader(async (tx) => {
			await publish(tx, "romans", 8, romans8);
			await tx
				.update(translations)
				.set({ copyrightNotice: "Public domain in most countries." })
				.where(eq(translations.abbreviation, "KJV"));

			const chapter = await getReaderChapter(tx, romans(8));

			expect(chapter).toMatchObject({
				chapterCount: 16,
				label: "Romans 8",
				next: 9,
				previous: 7,
				status: "available",
				translation: {
					abbreviation: "KJV",
					copyrightNotice: "Public domain in most countries.",
				},
			});
			if (chapter?.status !== "available") throw new Error("Not available");
			expect(chapter.verses.map((verse) => verse.number)).toEqual([
				28, 29, 30, 31, 33,
			]);
		});
	});

	it("has no previous chapter at the start of a book or next at the end", async () => {
		await inReader(async (tx) => {
			await publish(tx, "romans", 1, { 1: "Paul, a servant of Jesus Christ," });
			await publish(tx, "romans", 16, {
				1: "I commend unto you Phebe our sister,",
			});

			expect(await getReaderChapter(tx, romans(1))).toMatchObject({
				next: 2,
				previous: null,
			});
			expect(await getReaderChapter(tx, romans(16))).toMatchObject({
				next: null,
				previous: 15,
			});
		});
	});

	it("says a chapter isn't available yet, and points to the nearest one that is", async () => {
		await inReader(async (tx) => {
			await publish(tx, "romans", 8, romans8);
			await publish(tx, "romans", 12, { 1: "I beseech you therefore," });

			expect(await getReaderChapter(tx, romans(9))).toMatchObject({
				label: "Romans 9",
				nearestAvailable: 8,
				status: "not_available",
			});
			expect(await getReaderChapter(tx, romans(11))).toMatchObject({
				nearestAvailable: 12,
			});
			expect(
				await listAvailableChapters(tx, {
					bookSlug: "romans",
					translationAbbreviation: "KJV",
				}),
			).toEqual([8, 12]);
		});
	});

	it("refuses chapters and books that can't exist", async () => {
		await inReader(async (tx) => {
			await publish(tx, "romans", 8, romans8);

			expect(await getReaderChapter(tx, romans(17))).toBeNull();
			expect(await getReaderChapter(tx, romans(0))).toBeNull();
			expect(
				await getReaderChapter(tx, { ...romans(1), bookSlug: "not-a-book" }),
			).toBeNull();
		});
	});

	it("only reads translations that are published and allowed", async () => {
		await inReader(async (tx) => {
			await publish(tx, "romans", 8, romans8);
			// Text in a licensed translation without recorded permission stays hidden.
			await publish(tx, "romans", 8, { 28: "And we know that..." }, "NIV");
			await tx
				.update(translations)
				.set({
					licensed: true,
					permissionRecordedAt: null,
					permissionRecordedByUserId: null,
				})
				.where(eq(translations.abbreviation, "NIV"));

			const listed = await listReaderTranslations(tx);
			expect(listed.map((translation) => translation.abbreviation)).toEqual([
				"KJV",
				"NKJV",
				"ESV",
				"NIV",
				"NLT",
				"NASB",
			]);
			expect(
				listed
					.filter((translation) => translation.available)
					.map((translation) => translation.abbreviation),
			).toEqual(["KJV"]);
			expect(await getReaderChapter(tx, romans(8, ["NIV"]))).toMatchObject({
				translation: { abbreviation: "KJV" },
			});
		});
	});

	it("has nothing to read before any translation is published", async () => {
		await inReader(async (tx) => {
			expect(await getReaderChapter(tx, romans(8))).toBeNull();
		});
	});

	it("explains a verse number the translation skips", async () => {
		await inReader(async (tx) => {
			const { translationId, verseIds } = await publish(tx, "3-john", 1, {
				13: "I had many things to write,",
				14: "But I trust I shall shortly see thee, and we shall speak face to face. Peace be to thee.",
				15: null,
			});
			const into = verseIds.get(14);
			const missing = verseIds.get(15);
			if (!into || !missing) throw new Error("Missing verses");
			await tx.insert(versePresence).values({
				includedInVerseId: into,
				kind: "included_in",
				translationId,
				verseId: missing,
			});

			const chapter = await getReaderChapter(tx, {
				...romans(1),
				bookSlug: "3-john",
			});
			if (chapter?.status !== "available") throw new Error("Not available");
			expect(chapter.verses.map((verse) => verse.number)).toEqual([13, 14]);
			expect(chapter.missingVerses).toEqual([
				{
					afterVerse: 14,
					explanation:
						"Some Bibles split this verse in two. In the King James Version, those words are all in verse 14.",
					question: "Why is there no verse 15?",
				},
			]);
		});
	});
});

describe("book lists", () => {
	it("lists the Protestant books with reader group names and chapter counts", async () => {
		await inReader(async (tx) => {
			const { books: list, usingFallbackList } = await listCanonBooks(tx, null);

			expect(usingFallbackList).toBe(false);
			expect(list).toHaveLength(66);
			expect(list[0]).toMatchObject({
				chapterCount: 50,
				group: "Law",
				name: "Genesis",
				notInEveryTradition: false,
			});
			expect(list.find((book) => book.slug === "acts")?.group).toBe(
				"The early church",
			);
			expect(list.find((book) => book.slug === "romans")).toMatchObject({
				chapterCount: 16,
				group: "Letters",
			});
		});
	});

	it("marks books that aren't in every tradition's Bible", async () => {
		await inReader(async (tx) => {
			const { books: list } = await listCanonBooks(tx, "catholic");

			expect(list.find((book) => book.slug === "tobit")).toMatchObject({
				notInEveryTradition: true,
			});
			expect(list.find((book) => book.slug === "john")).toMatchObject({
				notInEveryTradition: false,
			});
		});
	});

	it("shows the Protestant list for a tradition whose list isn't entered yet", async () => {
		await inReader(async (tx) => {
			const result = await listCanonBooks(tx, "ethiopian-orthodox");

			expect(result.usingFallbackList).toBe(true);
			expect(result.tradition.slug).toBe("ethiopian-orthodox");
			expect(result.books).toHaveLength(66);
		});
	});
});

describe("reading settings", () => {
	it("starts new members on the defaults", async () => {
		await inReader(async (tx, userId) => {
			expect(await getReadingPreferences(tx, userId)).toMatchObject({
				pageColour: "light",
				showVerseNumbers: true,
				textSize: "large",
				verseLayout: "verse",
				welcomeCompleted: false,
			});
		});
	});

	it("saves only what changed, and remembers finishing the welcome", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);
			await saveReadingPreferences(tx, userId, { textSize: "largest" });
			const saved = await saveReadingPreferences(tx, userId, {
				traditionSlug: "catholic",
				translationAbbreviation: "kjv",
				welcomeCompleted: true,
			});

			expect(saved).toMatchObject({
				textSize: "largest",
				traditionSlug: "catholic",
				translationAbbreviation: "KJV",
				welcomeCompleted: true,
			});
		});
	});

	it("won't save a translation readers can't use yet", async () => {
		await inReader(async (tx, userId) => {
			await expect(
				saveReadingPreferences(tx, userId, { translationAbbreviation: "NIV" }),
			).rejects.toThrow("That translation isn't available yet.");
		});
	});
});

const chosen = (verseNumbers: number[]) => ({
	bookSlug: "romans",
	chapter: 8,
	translationAbbreviation: "KJV",
	verses: verseNumbers,
});

describe("highlights", () => {
	it("highlights whole verses, and Undo takes them away", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);

			const { label, undo } = await setVersesHighlighted(tx, userId, {
				...chosen([28, 29]),
				highlighted: true,
			});
			expect(label).toBe("Romans 8:28–29");
			expect(await listHighlightedVerses(tx, userId, chosen([]))).toEqual([
				28, 29,
			]);
			const [whole] = await tx
				.select({ end: highlights.endOffset, start: highlights.startOffset })
				.from(highlights)
				.where(eq(highlights.userId, userId))
				.limit(1);
			expect(whole?.start).toBe(0);
			expect(whole?.end).toBeGreaterThan(100);

			await undoHighlightChange(tx, userId, undo);
			expect(await listHighlightedVerses(tx, userId, chosen([]))).toEqual([]);
		});
	});

	it("removes every highlight on a verse, and Undo puts back exactly what was there", async () => {
		await inReader(async (tx, userId) => {
			const { translationId, verseIds } = await publish(
				tx,
				"romans",
				8,
				romans8,
			);
			const verseId = verseIds.get(28);
			if (!verseId) throw new Error("Missing verse");
			// A highlight on part of the verse, made somewhere else in the app.
			await tx.insert(highlights).values({
				endOffset: 30,
				startOffset: 4,
				translationId,
				userId,
				verseId,
			});

			const { undo } = await setVersesHighlighted(tx, userId, {
				...chosen([28]),
				highlighted: false,
			});
			expect(await listHighlightedVerses(tx, userId, chosen([]))).toEqual([]);

			await undoHighlightChange(tx, userId, undo);
			const restored = await tx
				.select({ end: highlights.endOffset, start: highlights.startOffset })
				.from(highlights)
				.where(eq(highlights.userId, userId));
			expect(restored).toEqual([{ end: 30, start: 4 }]);
		});
	});

	it("never removes another member's highlights through Undo", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);
			const other = await createAccount(tx);
			const { undo } = await setVersesHighlighted(tx, other.id, {
				...chosen([31]),
				highlighted: true,
			});

			await undoHighlightChange(tx, userId, undo);
			expect(await listHighlightedVerses(tx, other.id, chosen([]))).toEqual([
				31,
			]);
		});
	});

	it("refuses verses with no published text", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);
			await expect(
				setVersesHighlighted(tx, userId, {
					...chosen([32]),
					highlighted: true,
				}),
			).rejects.toThrow("One of these verses isn't available.");
		});
	});
});

describe("saving chosen verses", () => {
	it("makes one stored passage per run of verses, and reuses it next time", async () => {
		await inReader(async (tx) => {
			await publish(tx, "romans", 8, romans8);

			const first = await passagesForVerses(tx, chosen([28, 29, 30, 33]));
			expect(first.label).toBe("Romans 8:28–30, 33");
			expect(first.passages.map((passage) => passage.label)).toEqual([
				"Romans 8:28–30",
				"Romans 8:33",
			]);

			const again = await passagesForVerses(tx, chosen([33, 30, 29, 28]));
			expect(again.passages.map((passage) => passage.passageId)).toEqual(
				first.passages.map((passage) => passage.passageId),
			);
		});
	});

	it("finds where a stored passage starts, for older links", async () => {
		await inReader(async (tx) => {
			await publish(tx, "romans", 8, romans8);
			const { passages } = await passagesForVerses(tx, chosen([29, 30]));

			expect(await getPassageStart(tx, passages[0]?.passageId ?? 0)).toEqual({
				bookSlug: "romans",
				chapter: 8,
				verse: 29,
			});
			expect(await getPassageStart(tx, 0)).toBeNull();
		});
	});

	it("adds verses to Saved once, and Undo removes only what it added", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);
			const earlier = await saveVerses(tx, userId, chosen([31]));

			const saved = await saveVerses(tx, userId, chosen([28, 31]));
			expect(saved.label).toBe("Romans 8:28, 31");
			expect(saved.addedPassageIds).toHaveLength(1);

			await unsaveVerses(tx, userId, saved.addedPassageIds);
			const remaining = await tx
				.select({ passageId: bookmarks.passageId })
				.from(bookmarks)
				.where(eq(bookmarks.userId, userId));
			expect(remaining).toEqual([{ passageId: earlier.addedPassageIds[0] }]);
		});
	});
});

describe("marks beside verses", () => {
	it("marks verses covered by live study content, by group", async () => {
		await inReader(async (tx, userId) => {
			const { bookId } = await publish(tx, "romans", 8, romans8);
			async function addLive(
				kind: string,
				range: [fromVerse: number, toChapter: number, toVerse: number],
				live = true,
			) {
				const [item] = await tx
					.insert(contentItems)
					.values({
						kind,
						scopeKey: `test-${kind}-${range.join("-")}`,
						title: "Test",
					})
					.returning({ id: contentItems.id });
				if (!item) throw new Error("No item");
				const [revision] = await tx
					.insert(contentRevisions)
					.values({
						body: {},
						contentItemId: item.id,
						createdByUserId: userId,
						number: 1,
					})
					.returning({ id: contentRevisions.id });
				if (!revision) throw new Error("No revision");
				await tx.insert(contentPassages).values({
					bookId,
					contentRevisionId: revision.id,
					fromChapter: 8,
					fromVerse: range[0],
					position: 1,
					toChapter: range[1],
					toVerse: range[2],
				});
				if (live) {
					await tx
						.update(contentItems)
						.set({ liveRevisionId: revision.id })
						.where(eq(contentItems.id, item.id));
				}
			}
			await addLive("verse_commentary", [28, 8, 28]);
			await addLive("original_language_note", [28, 8, 28]);
			await addLive("passage_commentary", [31, 9, 5]);
			await addLive("cross_reference", [29, 8, 29], false);

			expect(
				await listStudyMarkers(tx, { bookSlug: "romans", chapter: 8 }),
			).toEqual([
				{ groups: ["explanation", "word_meanings"], verse: 28 },
				{ groups: ["explanation"], verse: 31 },
				{ groups: ["explanation"], verse: 33 },
			]);
		});
	});

	it("marks verses the member has written a note on", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);
			const { passages } = await passagesForVerses(tx, chosen([29, 30]));
			const [note] = await tx
				.insert(notes)
				.values({ content: "{}", title: "On calling", userId })
				.returning({ id: notes.id });
			if (!note || !passages[0]) throw new Error("No note");
			await tx.insert(notePassages).values({
				noteId: note.id,
				passageId: passages[0].passageId,
				position: 0,
			});

			expect(
				await listNoteMarkers(tx, userId, { bookSlug: "romans", chapter: 8 }),
			).toEqual([29, 30]);
			const other = await createAccount(tx);
			expect(
				await listNoteMarkers(tx, other.id, { bookSlug: "romans", chapter: 8 }),
			).toEqual([]);
		});
	});
});

describe("place and history", () => {
	it("remembers the member's place, replacing the old one", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);
			await saveReadingPlace(tx, userId, {
				bookSlug: "john",
				chapter: 3,
				translationAbbreviation: null,
				verse: 16,
			});
			await saveReadingPlace(tx, userId, {
				bookSlug: "romans",
				chapter: 8,
				translationAbbreviation: "KJV",
				verse: 28,
			});

			expect(await getReadingPlace(tx, userId)).toMatchObject({
				book: { name: "Romans", slug: "romans" },
				chapter: 8,
				label: "Romans 8",
				translationAbbreviation: "KJV",
				verse: 28,
			});
		});
	});

	it("records each chapter once per visit, and lists recent chapters newest first", async () => {
		await inReader(async (tx, userId) => {
			await recordChapterVisit(tx, userId, { bookSlug: "psalms", chapter: 23 });
			await recordChapterVisit(tx, userId, { bookSlug: "john", chapter: 3 });
			await recordChapterVisit(tx, userId, { bookSlug: "john", chapter: 3 });
			await recordChapterVisit(tx, userId, { bookSlug: "romans", chapter: 8 });
			// Everything in one test happens at the same moment, so set the times.
			await tx
				.update(readingHistory)
				.set({ visitedAt: new Date("2026-01-01") })
				.where(eq(readingHistory.chapter, 23));
			await tx
				.update(readingHistory)
				.set({ visitedAt: new Date("2026-02-01") })
				.where(eq(readingHistory.chapter, 3));

			const visits = await tx
				.select({ chapter: readingHistory.chapter })
				.from(readingHistory)
				.where(eq(readingHistory.userId, userId));
			expect(visits).toHaveLength(3);
			expect(
				(await listRecentChapters(tx, userId)).map((recent) => recent.label),
			).toEqual(["Romans 8", "John 3", "Psalm 23"]);
		});
	});
});

describe("sharing verses with Community", () => {
	// The feed reads with the app's database type; inside a test it's the transaction.
	const asDb = (tx: DbExecutor) => tx as unknown as typeof db;

	it("posts the published words, the reference and an optional thought", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);

			const result = await publishVersePost(tx, userId, {
				...chosen([28, 29]),
				thought: "  This got me through a hard week.  ",
			});
			if (!("id" in result)) throw new Error("Not published");

			const [post] = await tx
				.select({
					snapshot: communityPosts.snapshot,
					type: communityPosts.postType,
				})
				.from(communityPosts)
				.where(eq(communityPosts.id, result.id));
			expect(post).toEqual({
				snapshot: {
					excerpt: "This got me through a hard week.",
					title: "Romans 8:28–29 (KJV)",
					verseText: `28 ${romans8[28]} 29 ${romans8[29]}`,
				},
				type: "verse",
			});
			const linked = await tx
				.select({ id: communityPostPassages.passageId })
				.from(communityPostPassages)
				.where(eq(communityPostPassages.communityPostId, result.id));
			expect(linked).toHaveLength(1);

			const feed = await listCommunityFeed(asDb(tx), userId, {
				page: 1,
				pageSize: 50,
				view: "verse",
			});
			expect(feed.posts.find((item) => item.id === result.id)).toMatchObject({
				excerpt: "This got me through a hard week.",
				title: "Romans 8:28–29 (KJV)",
				type: "verse",
				verseText: `28 ${romans8[28]} 29 ${romans8[29]}`,
			});
		});
	});

	it("lets the thought be left out", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);
			const result = await publishVersePost(tx, userId, {
				...chosen([31]),
				thought: "",
			});
			if (!("id" in result)) throw new Error("Not published");

			const feed = await listCommunityFeed(asDb(tx), userId, {
				page: 1,
				pageSize: 50,
				view: "recent",
			});
			expect(feed.posts.find((item) => item.id === result.id)?.excerpt).toBe(
				"",
			);
		});
	});

	it("refuses a member whose posting is restricted", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);
			const moderator = await createAccount(tx);
			await tx.insert(postingRestrictions).values({
				endsAt: new Date(Date.now() + 86_400_000),
				restrictedByUserId: moderator.id,
				userId,
			});

			expect(
				await publishVersePost(tx, userId, { ...chosen([28]), thought: "" }),
			).toMatchObject({ refused: "restricted" });
		});
	});

	it("won't share verses that aren't published", async () => {
		await inReader(async (tx, userId) => {
			await publish(tx, "romans", 8, romans8);
			await expect(
				publishVersePost(tx, userId, { ...chosen([32]), thought: "" }),
			).rejects.toThrow("One of these verses isn't available.");
		});
	});
});
