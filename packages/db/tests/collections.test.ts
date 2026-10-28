import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "../src";
import {
	addPassageToCollection,
	arrangeCollectionPassages,
	createCollection,
	createCollectionSection,
	deleteCollectionSection,
	getCollectionDetail,
	getCollectionLibrary,
	markCollectionOpened,
	removePassageFromCollection,
	setCollectionPassageRead,
	setCollectionPinned,
	setCollectionsForNote,
	setCollectionsForPassage,
} from "../src/collections";
import { listNotes } from "../src/notes";
import { user } from "../src/schema/auth";
import { books } from "../src/schema/books";
import { chapters } from "../src/schema/chapters";
import { collectionNotes } from "../src/schema/collection_notes";
import { collectionPassages } from "../src/schema/collection_passages";
import { collections } from "../src/schema/collections";
import { notes } from "../src/schema/notes";
import { passageRanges } from "../src/schema/passage_ranges";
import { passages } from "../src/schema/passages";
import { translations } from "../src/schema/translations";
import { userPreferences } from "../src/schema/user_preferences";
import { verseTexts } from "../src/schema/verse_texts";
import { verses } from "../src/schema/verses";
import { versificationSystems } from "../src/schema/versification_systems";

const describeWithDatabase = process.env.DATABASE_URL
	? describe
	: describe.skip;

const collectionInput = {
	color: "#e4ebdf",
	description: "",
	tags: [],
	type: "project",
	visibility: "private",
} as const;

/** A user, a book and `passageCount` passages without verse ranges. */
async function createFixture(passageCount: number) {
	const suffix = randomUUID();
	const userId = `collection-test-${suffix}`;
	await db.insert(user).values({
		email: `collection-test-${suffix}@example.test`,
		id: userId,
		name: "Collection test user",
	});
	const [book] = await db
		.insert(books)
		.values({
			name: `Collection test book ${suffix}`,
			slug: `collection-test-book-${suffix}`,
			testament: "old",
		})
		.returning({ id: books.id });
	if (!book) throw new Error("Unable to create test book.");
	const passageRows = passageCount
		? await db
				.insert(passages)
				.values(
					Array.from({ length: passageCount }, (_, index) => ({
						bookId: book.id,
						title: `Passage ${index + 1}`,
					})),
				)
				.returning({ id: passages.id })
		: [];

	return {
		bookId: book.id,
		passageIds: passageRows.map((passage) => passage.id),
		suffix,
		userId,
		async cleanup() {
			await db.delete(user).where(eq(user.id, userId));
			if (passageRows.length) {
				await db.delete(passages).where(
					inArray(
						passages.id,
						passageRows.map((passage) => passage.id),
					),
				);
			}
			await db.delete(books).where(eq(books.id, book.id));
		},
	};
}

describeWithDatabase("passage collection memberships", () => {
	it("keeps another user's membership when a shared passage is updated", async () => {
		const suffix = randomUUID();
		const userAId = `collection-test-a-${suffix}`;
		const userBId = `collection-test-b-${suffix}`;
		let bookId: number | undefined;
		let passageId: number | undefined;

		try {
			await db.insert(user).values([
				{
					email: `collection-test-a-${suffix}@example.test`,
					id: userAId,
					name: "Collection test user A",
				},
				{
					email: `collection-test-b-${suffix}@example.test`,
					id: userBId,
					name: "Collection test user B",
				},
			]);

			const [book] = await db
				.insert(books)
				.values({
					name: `Collection test book ${suffix}`,
					slug: `collection-test-book-${suffix}`,
					testament: "new",
				})
				.returning({ id: books.id });
			bookId = book?.id;
			if (!bookId) throw new Error("Unable to create test book.");

			const [passage] = await db
				.insert(passages)
				.values({ bookId, title: "Collection test passage" })
				.returning({ id: passages.id });
			passageId = passage?.id;
			if (!passageId) throw new Error("Unable to create test passage.");

			const [aFirstCollection, aSecondCollection, bCollection] = await db
				.insert(collections)
				.values([
					{
						name: "User A first collection",
						normalizedName: "user a first collection",
						userId: userAId,
					},
					{
						name: "User A second collection",
						normalizedName: "user a second collection",
						userId: userAId,
					},
					{
						name: "User B collection",
						normalizedName: "user b collection",
						userId: userBId,
					},
				])
				.returning({ id: collections.id });
			if (!aFirstCollection || !aSecondCollection || !bCollection) {
				throw new Error("Unable to create test collections.");
			}

			await db.insert(collectionPassages).values([
				{ collectionId: aFirstCollection.id, passageId },
				{ collectionId: bCollection.id, passageId },
			]);

			await setCollectionsForPassage(db, userAId, passageId, [
				aSecondCollection.id,
			]);

			const memberships = await db
				.select({ collectionId: collectionPassages.collectionId })
				.from(collectionPassages)
				.where(
					and(
						eq(collectionPassages.passageId, passageId),
						inArray(collectionPassages.collectionId, [
							aFirstCollection.id,
							aSecondCollection.id,
							bCollection.id,
						]),
					),
				);

			expect(memberships.map((membership) => membership.collectionId)).toEqual(
				expect.arrayContaining([aSecondCollection.id, bCollection.id]),
			);
			expect(memberships).toHaveLength(2);
		} finally {
			await db.delete(user).where(inArray(user.id, [userAId, userBId]));
			if (passageId) {
				await db.delete(passages).where(eq(passages.id, passageId));
			}
			if (bookId) {
				await db.delete(books).where(eq(books.id, bookId));
			}
		}
	});

	it("keeps read state and place when a passage stays in a collection", async () => {
		const fixture = await createFixture(2);
		try {
			const [first, second] = fixture.passageIds as [number, number];
			const collection = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "Kept state",
			});
			const other = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "Other",
			});
			await addPassageToCollection(
				db,
				fixture.userId,
				collection.id,
				first,
				null,
			);
			await addPassageToCollection(
				db,
				fixture.userId,
				collection.id,
				second,
				null,
			);
			await setCollectionPassageRead(
				db,
				fixture.userId,
				collection.id,
				second,
				true,
			);

			await setCollectionsForPassage(db, fixture.userId, second, [
				collection.id,
				other.id,
			]);

			const detail = await getCollectionDetail(
				db,
				fixture.userId,
				collection.id,
			);
			expect(detail?.passages.map((passage) => passage.passageId)).toEqual([
				first,
				second,
			]);
			expect(detail?.passages[1]?.readAt).not.toBeNull();
		} finally {
			await fixture.cleanup();
		}
	});
});

describeWithDatabase("note collection memberships", () => {
	it("allows a note in multiple owned collections and filters by each collection", async () => {
		const suffix = randomUUID();
		const userId = `note-collection-test-${suffix}`;

		try {
			await db.insert(user).values({
				email: `note-collection-test-${suffix}@example.test`,
				id: userId,
				name: "Note collection test user",
			});

			const [firstCollection, secondCollection] = await db
				.insert(collections)
				.values([
					{
						name: "First note collection",
						normalizedName: "first note collection",
						userId,
					},
					{
						name: "Second note collection",
						normalizedName: "second note collection",
						userId,
					},
				])
				.returning({ id: collections.id });
			if (!firstCollection || !secondCollection) {
				throw new Error("Unable to create test collections.");
			}

			const [note] = await db
				.insert(notes)
				.values({ content: "A collection membership test note", userId })
				.returning({ id: notes.id });
			if (!note) throw new Error("Unable to create a test note.");

			await setCollectionsForNote(db, userId, note.id, [
				firstCollection.id,
				secondCollection.id,
			]);

			const memberships = await db
				.select({ collectionId: collectionNotes.collectionId })
				.from(collectionNotes)
				.where(eq(collectionNotes.noteId, note.id));
			expect(memberships.map((membership) => membership.collectionId)).toEqual(
				expect.arrayContaining([firstCollection.id, secondCollection.id]),
			);

			const notesInFirstCollection = await listNotes(db, userId, {
				collectionIds: [firstCollection.id],
				sort: "updated",
			});
			const notesInSecondCollection = await listNotes(db, userId, {
				collectionIds: [secondCollection.id],
				sort: "updated",
			});

			expect(
				notesInFirstCollection.map((storedNote) => storedNote.id),
			).toContain(note.id);
			expect(
				notesInSecondCollection.map((storedNote) => storedNote.id),
			).toContain(note.id);
		} finally {
			await db.delete(user).where(eq(user.id, userId));
		}
	});
});

describeWithDatabase("collection details", () => {
	it("returns a collection detail with its notes", async () => {
		const suffix = randomUUID();
		const userId = `collection-detail-test-${suffix}`;

		try {
			await db.insert(user).values({
				email: `collection-detail-test-${suffix}@example.test`,
				id: userId,
				name: "Collection detail test user",
			});
			const [collection] = await db
				.insert(collections)
				.values({
					name: "Collection detail",
					normalizedName: "collection detail",
					userId,
				})
				.returning({ id: collections.id });
			const [note] = await db
				.insert(notes)
				.values({ content: "A detail note", userId })
				.returning({ id: notes.id });
			if (!collection || !note) throw new Error("Unable to create test data.");

			await setCollectionsForNote(db, userId, note.id, [collection.id]);

			const detail = await getCollectionDetail(db, userId, collection.id);

			expect(detail?.collection.id).toBe(collection.id);
			expect(detail?.notes.map((storedNote) => storedNote.id)).toEqual([
				note.id,
			]);
			expect(detail?.passages).toEqual([]);
		} finally {
			await db.delete(user).where(eq(user.id, userId));
		}
	});

	it("gives a new collection the private, unpinned defaults", async () => {
		const fixture = await createFixture(0);
		try {
			const [row] = await db
				.insert(collections)
				.values({
					name: "Old collection",
					normalizedName: "old collection",
					userId: fixture.userId,
				})
				.returning();
			expect(row).toMatchObject({
				color: "#efebe4",
				lastOpenedAt: null,
				pinnedAt: null,
				type: "list",
				visibility: "private",
			});
		} finally {
			await fixture.cleanup();
		}
	});
});

describeWithDatabase("collection sections and order", () => {
	it("reads passages in order: unsectioned first, then each section", async () => {
		const fixture = await createFixture(4);
		try {
			const [a, b, c, d] = fixture.passageIds as [
				number,
				number,
				number,
				number,
			];
			const { id } = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "Ordered",
			});
			const first = await createCollectionSection(
				db,
				fixture.userId,
				id,
				"I. First",
			);
			const second = await createCollectionSection(
				db,
				fixture.userId,
				id,
				"II. Second",
			);
			if (!first || !second) throw new Error("Unable to create sections.");
			await addPassageToCollection(db, fixture.userId, id, a, second.id);
			await addPassageToCollection(db, fixture.userId, id, b, first.id);
			await addPassageToCollection(db, fixture.userId, id, c, null);
			await addPassageToCollection(db, fixture.userId, id, d, first.id);

			const detail = await getCollectionDetail(db, fixture.userId, id);
			expect(detail?.sections.map((section) => section.title)).toEqual([
				"I. First",
				"II. Second",
			]);
			expect(detail?.passages.map((passage) => passage.passageId)).toEqual([
				c,
				b,
				d,
				a,
			]);
		} finally {
			await fixture.cleanup();
		}
	});

	it("saves a dragged arrangement and refuses a stale one", async () => {
		const fixture = await createFixture(3);
		try {
			const [a, b, c] = fixture.passageIds as [number, number, number];
			const { id } = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "Dragged",
			});
			const section = await createCollectionSection(
				db,
				fixture.userId,
				id,
				"Section",
			);
			if (!section) throw new Error("Unable to create a section.");
			for (const passageId of [a, b, c]) {
				await addPassageToCollection(db, fixture.userId, id, passageId, null);
			}

			await arrangeCollectionPassages(db, fixture.userId, id, [
				{ passageIds: [c], sectionId: null },
				{ passageIds: [b, a], sectionId: section.id },
			]);
			const detail = await getCollectionDetail(db, fixture.userId, id);
			expect(
				detail?.passages.map(({ passageId, sectionId }) => ({
					passageId,
					sectionId,
				})),
			).toEqual([
				{ passageId: c, sectionId: null },
				{ passageId: b, sectionId: section.id },
				{ passageId: a, sectionId: section.id },
			]);

			await expect(
				arrangeCollectionPassages(db, fixture.userId, id, [
					{ passageIds: [a, b], sectionId: null },
				]),
			).rejects.toThrow("The collection's passages have changed.");
		} finally {
			await fixture.cleanup();
		}
	});

	it("keeps a deleted section's passages at the end, in order", async () => {
		const fixture = await createFixture(3);
		try {
			const [a, b, c] = fixture.passageIds as [number, number, number];
			const { id } = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "Deleted section",
			});
			const section = await createCollectionSection(
				db,
				fixture.userId,
				id,
				"Doomed",
			);
			if (!section) throw new Error("Unable to create a section.");
			await addPassageToCollection(db, fixture.userId, id, a, null);
			await addPassageToCollection(db, fixture.userId, id, b, section.id);
			await addPassageToCollection(db, fixture.userId, id, c, section.id);

			await deleteCollectionSection(db, fixture.userId, id, section.id);

			const detail = await getCollectionDetail(db, fixture.userId, id);
			expect(detail?.sections).toEqual([]);
			expect(detail?.passages.map((passage) => passage.passageId)).toEqual([
				a,
				b,
				c,
			]);
			expect(detail?.passages.every((passage) => !passage.sectionId)).toBe(
				true,
			);
		} finally {
			await fixture.cleanup();
		}
	});

	it("closes the gap when a passage is removed", async () => {
		const fixture = await createFixture(3);
		try {
			const [a, b, c] = fixture.passageIds as [number, number, number];
			const { id } = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "Removed",
			});
			for (const passageId of [a, b, c]) {
				await addPassageToCollection(db, fixture.userId, id, passageId, null);
			}

			await removePassageFromCollection(db, fixture.userId, id, b);

			const positions = await db
				.select({
					passageId: collectionPassages.passageId,
					position: collectionPassages.position,
				})
				.from(collectionPassages)
				.where(eq(collectionPassages.collectionId, id))
				.orderBy(collectionPassages.position);
			expect(positions).toEqual([
				{ passageId: a, position: 0 },
				{ passageId: c, position: 1 },
			]);
		} finally {
			await fixture.cleanup();
		}
	});
});

describeWithDatabase("collection library", () => {
	it("summarises counts and progress, and offers the last opened project", async () => {
		const fixture = await createFixture(4);
		try {
			const [a, b, c, d] = fixture.passageIds as [
				number,
				number,
				number,
				number,
			];
			const project = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "Project",
			});
			const list = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "List",
				type: "list",
			});
			for (const passageId of [a, b, c, d]) {
				await addPassageToCollection(
					db,
					fixture.userId,
					project.id,
					passageId,
					null,
				);
			}
			await addPassageToCollection(db, fixture.userId, list.id, d, null);
			await setCollectionPassageRead(db, fixture.userId, project.id, a, true);
			await markCollectionOpened(db, fixture.userId, project.id);

			const library = await getCollectionLibrary(db, fixture.userId);
			const summary = library.collections.find(
				(collection) => collection.id === project.id,
			);
			expect(summary).toMatchObject({
				cover: { passageId: a, reference: "Passage 1" },
				passageCount: 4,
				progress: 25,
				readCount: 1,
				type: "project",
			});
			expect(
				library.collections.find((collection) => collection.id === list.id)
					?.progress,
			).toBeNull();
			expect(library.continueStudying).toMatchObject({
				collectionId: project.id,
				next: { passageId: b, reference: "Passage 2", text: null },
			});
		} finally {
			await fixture.cleanup();
		}
	});

	it("doesn't count pinning or opening as an update", async () => {
		const fixture = await createFixture(0);
		try {
			const { id } = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "Pinned",
			});
			const before = await getCollectionLibrary(db, fixture.userId);

			await setCollectionPinned(db, fixture.userId, id, true);
			await markCollectionOpened(db, fixture.userId, id);

			const after = await getCollectionLibrary(db, fixture.userId);
			expect(after.collections[0]?.pinned).toBe(true);
			expect(after.collections[0]?.updatedAt).toEqual(
				before.collections[0]?.updatedAt,
			);
		} finally {
			await fixture.cleanup();
		}
	});

	it("uses the first passage's reference and verse as the cover", async () => {
		const fixture = await createFixture(0);
		const suffix = fixture.suffix;
		let systemId: number | undefined;
		let translationId: number | undefined;
		let passageId: number | undefined;
		try {
			const [system] = await db
				.insert(versificationSystems)
				.values({ name: `Test ${suffix}`, slug: `test-${suffix}` })
				.returning({ id: versificationSystems.id });
			systemId = system?.id;
			if (!systemId) throw new Error("Unable to create versification.");
			const [translation] = await db
				.insert(translations)
				.values({
					abbreviation: `T${suffix.slice(0, 8)}`,
					name: `Test translation ${suffix}`,
					slug: `test-translation-${suffix}`,
					versificationSystemId: systemId,
				})
				.returning({ id: translations.id });
			translationId = translation?.id;
			if (!translationId) throw new Error("Unable to create translation.");
			await db.insert(userPreferences).values({
				preferredTranslationId: translationId,
				userId: fixture.userId,
			});
			const [chapter] = await db
				.insert(chapters)
				.values({
					bookId: fixture.bookId,
					number: 88,
					versificationSystemId: systemId,
				})
				.returning({ id: chapters.id });
			if (!chapter) throw new Error("Unable to create chapter.");
			const verseRows = await db
				.insert(verses)
				.values([1, 2, 3].map((number) => ({ chapterId: chapter.id, number })))
				.returning({ id: verses.id, number: verses.number });
			await db.insert(verseTexts).values(
				verseRows.map((verse) => ({
					text: `Verse ${verse.number}`,
					translationId: translationId as number,
					verseId: verse.id,
				})),
			);
			const [passage] = await db
				.insert(passages)
				.values({ bookId: fixture.bookId, title: "Heman's lament" })
				.returning({ id: passages.id });
			passageId = passage?.id;
			if (!passageId) throw new Error("Unable to create passage.");
			const startVerse = verseRows.find((verse) => verse.number === 1);
			const endVerse = verseRows.find((verse) => verse.number === 3);
			if (!startVerse || !endVerse) throw new Error("Missing verses.");
			await db.insert(passageRanges).values({
				endVerseId: endVerse.id,
				passageId,
				startVerseId: startVerse.id,
				versificationSystemId: systemId,
			});
			const { id } = await createCollection(db, fixture.userId, {
				...collectionInput,
				name: "Covered",
			});
			await addPassageToCollection(db, fixture.userId, id, passageId, null);

			const library = await getCollectionLibrary(db, fixture.userId);
			expect(library.collections[0]?.cover).toEqual({
				passageId,
				reference: `Collection test book ${suffix} 88:1–3`,
				text: "Verse 1",
			});
			const detail = await getCollectionDetail(db, fixture.userId, id);
			expect(detail?.passages[0]?.verses.map((verse) => verse.text)).toEqual([
				"Verse 1",
				"Verse 2",
				"Verse 3",
			]);
		} finally {
			// Scripture rows refer to the book, so they go before the fixture.
			if (passageId) {
				await db
					.delete(passageRanges)
					.where(eq(passageRanges.passageId, passageId));
				await db.delete(passages).where(eq(passages.id, passageId));
			}
			if (translationId) {
				await db
					.delete(verseTexts)
					.where(eq(verseTexts.translationId, translationId));
			}
			if (systemId) {
				const chapterIds = db
					.select({ id: chapters.id })
					.from(chapters)
					.where(eq(chapters.versificationSystemId, systemId));
				await db.delete(verses).where(inArray(verses.chapterId, chapterIds));
				await db
					.delete(chapters)
					.where(eq(chapters.versificationSystemId, systemId));
			}
			await fixture.cleanup();
			if (translationId) {
				await db.delete(translations).where(eq(translations.id, translationId));
			}
			if (systemId) {
				await db
					.delete(versificationSystems)
					.where(eq(versificationSystems.id, systemId));
			}
		}
	});
});

afterAll(async () => {
	await pool.end();
});
