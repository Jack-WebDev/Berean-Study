import { randomUUID } from "node:crypto";

import {
	getDocumentText,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "../src";
import {
	countNotesForPassage,
	countNoteViews,
	getNote,
	listNoteBooks,
	listNotes,
	listNoteTags,
	listNoteVersions,
	restoreNoteVersion,
	saveNote,
	setNotePinned,
} from "../src/notes";
import { getPassageText, getVerseRangeText } from "../src/passages";
import { user } from "../src/schema/auth";
import { books } from "../src/schema/books";
import { chapters } from "../src/schema/chapters";
import { noteVersions } from "../src/schema/note_versions";
import { notes } from "../src/schema/notes";
import { passageRanges } from "../src/schema/passage_ranges";
import { passages } from "../src/schema/passages";
import { translations } from "../src/schema/translations";
import { verseTexts } from "../src/schema/verse_texts";
import { verses } from "../src/schema/verses";
import { versificationSystems } from "../src/schema/versification_systems";

const originalContent = {
	content: [
		{
			content: [{ text: "Original content", type: "text" }],
			type: "paragraph",
		},
	],
	type: "doc" as const,
};
const updatedContent = {
	content: [
		{ content: [{ text: "Updated content", type: "text" }], type: "paragraph" },
	],
	type: "doc" as const,
};

const describeWithDatabase = process.env.DATABASE_URL
	? describe
	: describe.skip;

describeWithDatabase("note saves", () => {
	it("rolls back note fields and tags when tag assignment fails", async () => {
		const suffix = randomUUID();
		const userId = `note-save-test-${suffix}`;
		const failureConstraintName = `note_save_rollback_${suffix.replaceAll("-", "")}`;
		let constraintAdded = false;

		try {
			await db.insert(user).values({
				email: `note-save-test-${suffix}@example.test`,
				id: userId,
				name: "Note save test user",
			});

			const note = await saveNote(db, userId, {
				content: originalContent,
				passageIds: [],
				tags: ["Original tag"],
				title: "Original title",
			});
			if (!note) throw new Error("Unable to create test note.");

			await db.execute(
				sql.raw(
					`ALTER TABLE note_tag_assignments ADD CONSTRAINT ${failureConstraintName} CHECK (note_id <> ${note.id}) NOT VALID`,
				),
			);
			constraintAdded = true;

			await expect(
				saveNote(db, userId, {
					content: updatedContent,
					id: note.id,
					passageIds: [],
					tags: ["Updated tag"],
					title: "Updated title",
				}),
			).rejects.toThrow();

			const savedNote = await getNote(db, userId, note.id);
			expect(savedNote).toMatchObject({
				content: originalContent,
				tags: [{ name: "Original tag" }],
				title: "Original title",
			});
		} finally {
			if (constraintAdded) {
				await db.execute(
					sql.raw(
						`ALTER TABLE note_tag_assignments DROP CONSTRAINT ${failureConstraintName}`,
					),
				);
			}
			await db.delete(user).where(eq(user.id, userId));
		}
	});
});

describeWithDatabase("note passages and status", () => {
	it("links several passages in order and finds the note by any of them", async () => {
		await withScripture(async ({ bookId, passageIds, userId }) => {
			const [first, second] = passageIds;
			const note = await saveNote(db, userId, {
				content: originalContent,
				passageIds: [second, first, second],
				tags: [],
				title: "Two passages",
			});
			if (!note) throw new Error("Unable to create test note.");

			const saved = await getNote(db, userId, note.id);
			expect(saved?.passageId).toBe(second);
			expect(saved?.passages.map((passage) => passage.id)).toEqual([
				second,
				first,
			]);
			expect(
				(
					await listNotes(db, userId, {
						passageId: first,
						sort: "updated",
					})
				).map((listed) => listed.id),
			).toEqual([note.id]);
			expect(await countNotesForPassage(db, userId, first)).toBe(1);
			expect(await listNoteBooks(db, userId)).toEqual([
				{ id: bookId, name: expect.any(String) },
			]);

			await saveNote(db, userId, {
				content: originalContent,
				id: note.id,
				passageIds: [first],
				tags: [],
				title: "One passage",
			});
			expect(
				(await getNote(db, userId, note.id))?.passages.map(
					(passage) => passage.id,
				),
			).toEqual([first]);
		});
	});

	it("keeps untitled notes in draft and requires a title once saved", async () => {
		await withScripture(async ({ userId }) => {
			const draft = await saveNote(db, userId, {
				content: originalContent,
				passageIds: [],
				tags: [],
				title: "  ",
			});
			if (!draft) throw new Error("Unable to create draft note.");
			expect(draft.status).toBe("draft");

			await expect(
				saveNote(db, userId, {
					content: originalContent,
					id: draft.id,
					passageIds: [],
					status: "saved",
					tags: [],
					title: "",
				}),
			).rejects.toThrow();

			const saved = await saveNote(db, userId, {
				content: originalContent,
				id: draft.id,
				passageIds: [],
				status: "saved",
				tags: [],
				title: "Titled",
			});
			expect(saved?.status).toBe("saved");

			const autosaved = await saveNote(db, userId, {
				content: updatedContent,
				id: draft.id,
				passageIds: [],
				tags: [],
				title: "Titled again",
			});
			expect(autosaved?.status).toBe("saved");
		});
	});

	it("rejects passages that do not exist", async () => {
		await withScripture(async ({ userId }) => {
			await expect(
				saveNote(db, userId, {
					content: originalContent,
					passageIds: [2_147_483_000],
					tags: [],
					title: "Missing passage",
				}),
			).rejects.toThrow("Passage not found.");
		});
	});

	it("reads passage and verse range text in the requested translation", async () => {
		await withScripture(
			async ({
				bookId,
				passageIds,
				translationAbbreviation,
				translationId,
			}) => {
				const text = await getPassageText(db, passageIds[0], translationId);
				expect(text?.verses).toEqual([
					{ chapter: 17, number: 10, text: "Verse ten." },
					{ chapter: 17, number: 11, text: "Verse eleven." },
					{ chapter: 17, number: 12, text: "Verse twelve." },
				]);
				expect(text?.translation.abbreviation).toBe(translationAbbreviation);

				expect(
					await getVerseRangeText(db, {
						bookId,
						chapter: 17,
						translation: translationAbbreviation,
						verseEnd: 11,
						verseStart: 11,
					}),
				).toEqual([{ number: 11, text: "Verse eleven." }]);
			},
		);
	});
});

describeWithDatabase("notes library", () => {
	it("searches note words rather than the stored document structure", async () => {
		await withScripture(async ({ userId }) => {
			const note = await saveNote(db, userId, {
				content: paragraphs("Faith comes by hearing"),
				passageIds: [],
				tags: [],
				title: "",
			});

			const search = (query: string) =>
				listNotes(db, userId, { query }).then((found) =>
					found.map((listed) => listed.id),
				);
			expect(await search("hearing")).toEqual([note?.id]);
			expect(await search("paragraph")).toEqual([]);
		});
	});

	it("splits notes into drafts and linked notes and counts each tab", async () => {
		await withScripture(async ({ bookId, passageIds, userId }) => {
			const linkedDraft = await saveNote(db, userId, {
				content: paragraphs("Linked draft"),
				passageIds: [passageIds[1]],
				tags: [],
				title: "",
			});
			await saveNote(db, userId, {
				content: paragraphs("Saved"),
				passageIds: [],
				status: "saved",
				tags: ["Grace"],
				title: "Saved",
			});
			const ids = (found: Array<{ id: number }>) =>
				found.map((listed) => listed.id).sort();

			expect(ids(await listNotes(db, userId, { view: "drafts" }))).toEqual([
				linkedDraft?.id,
			]);
			expect(ids(await listNotes(db, userId, { view: "linked" }))).toEqual([
				linkedDraft?.id,
			]);
			expect(await countNoteViews(db, userId, {})).toEqual({
				all: 2,
				drafts: 1,
				linked: 1,
			});
			expect(ids(await listNotes(db, userId, { bookIds: [bookId] }))).toEqual([
				linkedDraft?.id,
			]);
			const tagIds = (await listNoteTags(db, userId)).map((tag) => tag.id);
			expect(await countNoteViews(db, userId, { tagIds })).toEqual({
				all: 1,
				drafts: 0,
				linked: 0,
			});
		});
	});

	it("sorts untitled notes by their first words", async () => {
		await withScripture(async ({ userId }) => {
			for (const [title, body] of [
				["Mercy", "Body"],
				["", "Beginnings"],
				["Covenant", "Body"],
			] as const) {
				await saveNote(db, userId, {
					content: paragraphs(body),
					passageIds: [],
					tags: [],
					title,
				});
			}

			const listed = await listNotes(db, userId, { sort: "title" });
			expect(
				listed.map((note) => note.title || getDocumentText(note.content)),
			).toEqual(["Beginnings", "Covenant", "Mercy"]);
		});
	});

	it("pins a note without changing when it was last edited", async () => {
		await withScripture(async ({ userId }) => {
			const note = await saveNote(db, userId, {
				content: paragraphs("Pinned"),
				passageIds: [],
				tags: [],
				title: "Pinned",
			});
			if (!note) throw new Error("Unable to create test note.");

			expect(await setNotePinned(db, userId, note.id, true)).toBe(true);
			const pinned = await getNote(db, userId, note.id);
			expect(pinned?.pinnedAt).toBeInstanceOf(Date);
			expect(pinned?.updatedAt).toEqual(note.updatedAt);

			await setNotePinned(db, userId, note.id, false);
			expect((await getNote(db, userId, note.id))?.pinnedAt).toBeNull();
			expect(await setNotePinned(db, "someone-else", note.id, true)).toBe(
				false,
			);
		});
	});

	it("keeps the purpose unless a save changes or clears it", async () => {
		await withScripture(async ({ userId }) => {
			const note = await saveNote(db, userId, {
				content: paragraphs("Purpose"),
				passageIds: [],
				purpose: "prayer",
				tags: [],
				title: "",
			});
			if (!note) throw new Error("Unable to create test note.");
			expect(note.purpose).toBe("prayer");

			const kept = await saveNote(db, userId, {
				content: paragraphs("Purpose kept"),
				id: note.id,
				passageIds: [],
				tags: [],
				title: "",
			});
			expect(kept?.purpose).toBe("prayer");

			const cleared = await saveNote(db, userId, {
				content: paragraphs("Purpose cleared"),
				id: note.id,
				passageIds: [],
				purpose: null,
				tags: [],
				title: "",
			});
			expect(cleared?.purpose).toBeNull();
		});
	});

	it("writes versions when they're due and restores without losing history", async () => {
		await withScripture(async ({ userId }) => {
			const save = (content: RichTextDocument, id?: number) =>
				saveNote(db, userId, {
					content,
					id,
					passageIds: [],
					tags: [],
					title: "",
				});
			const summaries = async (noteId: number) =>
				(await listNoteVersions(db, userId, noteId))?.map(
					(version) => version.summary,
				);

			const note = await save(paragraphs("Observe the text"));
			if (!note) throw new Error("Unable to create test note.");
			expect(await summaries(note.id)).toEqual(["Note created"]);

			// Typing more within five minutes doesn't add a version...
			await save(paragraphs("Observe the text closely"), note.id);
			expect(await summaries(note.id)).toEqual(["Note created"]);

			// ...but adding a section does.
			await save(
				{
					content: [
						...(paragraphs("Observe the text closely").content ?? []),
						{
							attrs: { level: 2, variant: "interpret" },
							content: [{ text: "Interpret", type: "text" }],
							type: "heading",
						},
					],
					type: "doc",
				},
				note.id,
			);
			expect(await summaries(note.id)).toEqual([
				"Added Interpret",
				"Note created",
			]);

			// Five minutes after the last version, any change is kept.
			await db
				.update(noteVersions)
				.set({ createdAt: new Date(Date.now() - 6 * 60 * 1000) })
				.where(eq(noteVersions.noteId, note.id));
			await save(paragraphs("A later thought"), note.id);
			const versions = await listNoteVersions(db, userId, note.id);
			expect(versions?.[0]).toMatchObject({ isCurrent: true, summary: null });

			const firstVersion = versions?.at(-1);
			if (!firstVersion) throw new Error("Expected the first version.");
			const restored = await restoreNoteVersion(
				db,
				userId,
				note.id,
				firstVersion.id,
			);
			expect(getDocumentText(restored?.content ?? paragraphs(""))).toBe(
				"Observe the text",
			);
			expect(await summaries(note.id)).toEqual([
				"Restored an earlier version",
				null,
				"Added Interpret",
				"Note created",
			]);
			// The restored text matches "Note created" too, but only the newest
			// version counts as current.
			expect(
				(await listNoteVersions(db, userId, note.id))?.map(
					(version) => version.isCurrent,
				),
			).toEqual([true, false, false, false]);
			expect(
				await restoreNoteVersion(db, "someone-else", note.id, firstVersion.id),
			).toBeNull();
		});
	});

	it("keeps a saved note's title when restoring an untitled draft", async () => {
		await withScripture(async ({ userId }) => {
			const draft = await saveNote(db, userId, {
				content: paragraphs("Draft body"),
				passageIds: [],
				tags: [],
				title: "",
			});
			if (!draft) throw new Error("Unable to create test note.");
			await saveNote(db, userId, {
				content: paragraphs("Saved body"),
				id: draft.id,
				passageIds: [],
				status: "saved",
				tags: [],
				title: "Kept title",
			});

			const [, untitled] = (await listNoteVersions(db, userId, draft.id)) ?? [];
			if (!untitled) throw new Error("Expected the draft version.");
			const restored = await restoreNoteVersion(
				db,
				userId,
				draft.id,
				untitled.id,
			);
			expect(restored?.title).toBe("Kept title");
			expect(getDocumentText(restored?.content ?? paragraphs(""))).toBe(
				"Draft body",
			);
		});
	});
});

function paragraphs(...texts: string[]): RichTextDocument {
	return {
		content: texts.map((text) => ({
			content: text ? [{ text, type: "text" }] : [],
			type: "paragraph",
		})),
		type: "doc",
	};
}

/** Creates a member, a book with one chapter of text, and two passages over it. */
async function withScripture(
	run: (fixture: {
		bookId: number;
		passageIds: [number, number];
		translationAbbreviation: string;
		translationId: number;
		userId: string;
	}) => Promise<void>,
) {
	const suffix = randomUUID();
	const userId = `note-passages-test-${suffix}`;
	// Each step registers its cleanup as soon as its rows exist; cleanups run
	// newest first so dependent rows are removed before what they reference.
	const cleanup: Array<() => Promise<unknown>> = [];

	try {
		await db.insert(user).values({
			email: `${userId}@example.test`,
			id: userId,
			name: "Note passages test user",
		});
		cleanup.unshift(() => db.delete(user).where(eq(user.id, userId)));

		const system = required(
			await db
				.insert(versificationSystems)
				.values({
					name: `Test system ${suffix}`,
					slug: `test-system-${suffix}`,
				})
				.returning({ id: versificationSystems.id }),
		);
		cleanup.unshift(() =>
			db
				.delete(versificationSystems)
				.where(eq(versificationSystems.id, system.id)),
		);

		const book = required(
			await db
				.insert(books)
				.values({
					name: `Test book ${suffix}`,
					slug: `test-book-${suffix}`,
					testament: "new",
				})
				.returning({ id: books.id }),
		);
		cleanup.unshift(() => db.delete(books).where(eq(books.id, book.id)));

		const abbreviation = `T${suffix.slice(0, 8)}`;
		const translation = required(
			await db
				.insert(translations)
				.values({
					abbreviation,
					name: `Test translation ${suffix}`,
					slug: `test-translation-${suffix}`,
					versificationSystemId: system.id,
				})
				.returning({ id: translations.id }),
		);
		cleanup.unshift(() =>
			db.delete(translations).where(eq(translations.id, translation.id)),
		);

		const chapter = required(
			await db
				.insert(chapters)
				.values({
					bookId: book.id,
					number: 17,
					versificationSystemId: system.id,
				})
				.returning({ id: chapters.id }),
		);
		cleanup.unshift(() =>
			db.delete(chapters).where(eq(chapters.id, chapter.id)),
		);

		const chapterVerses = await db
			.insert(verses)
			.values(
				[9, 10, 11, 12, 13].map((number) => ({
					chapterId: chapter.id,
					number,
				})),
			)
			.returning({ id: verses.id, number: verses.number });
		cleanup.unshift(() =>
			db.delete(verses).where(eq(verses.chapterId, chapter.id)),
		);

		const words: Record<number, string> = {
			9: "nine",
			10: "ten",
			11: "eleven",
			12: "twelve",
			13: "thirteen",
		};
		await db.insert(verseTexts).values(
			chapterVerses.map((verse) => ({
				text: `Verse ${words[verse.number]}.`,
				translationId: translation.id,
				verseId: verse.id,
			})),
		);
		cleanup.unshift(() =>
			db.delete(verseTexts).where(eq(verseTexts.translationId, translation.id)),
		);

		const [passageA, passageB] = await db
			.insert(passages)
			.values([
				{ bookId: book.id, title: `Test passage A ${suffix}` },
				{ bookId: book.id, title: `Test passage B ${suffix}` },
			])
			.returning({ id: passages.id });
		cleanup.unshift(() =>
			db.delete(passages).where(eq(passages.bookId, book.id)),
		);
		if (!passageA || !passageB) throw new Error("Unable to create passages.");

		const verseId = (number: number) =>
			required(chapterVerses.filter((verse) => verse.number === number)).id;
		await db.insert(passageRanges).values({
			endVerseId: verseId(12),
			passageId: passageA.id,
			startVerseId: verseId(10),
			versificationSystemId: system.id,
		});
		cleanup.unshift(() =>
			db
				.delete(passageRanges)
				.where(eq(passageRanges.versificationSystemId, system.id)),
		);

		cleanup.unshift(() => db.delete(notes).where(eq(notes.userId, userId)));
		await run({
			bookId: book.id,
			passageIds: [passageA.id, passageB.id],
			translationAbbreviation: abbreviation,
			translationId: translation.id,
			userId,
		});
	} finally {
		for (const step of cleanup) await step();
	}
}

function required<T>(rows: T[]): T {
	const [row] = rows;
	if (!row) throw new Error("Expected a fixture row.");
	return row;
}

afterAll(async () => {
	await pool.end();
});
