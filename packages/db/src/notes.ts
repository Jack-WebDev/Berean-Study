import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

import type { db } from "./index";
import { books } from "./schema/books";
import { collectionNotes } from "./schema/collection_notes";
import { collections } from "./schema/collections";
import { noteTagAssignments, userNoteTags } from "./schema/note_tags";
import { notes } from "./schema/notes";
import { passages } from "./schema/passages";

type DbClient = typeof db;

export type CreateNoteInput = {
	content: string;
	passageId?: number | null;
	title: string;
};

export type UpdateNoteInput = CreateNoteInput;

export type SaveNoteInput = CreateNoteInput & {
	id?: number;
	tags: string[];
};

export type SetNoteTagsInput = {
	tags: string[];
};

export type ListNotesInput = {
	bookId?: number;
	collectionId?: number;
	passageId?: number;
	query?: string;
	sort: "updated-desc";
	tagId?: number;
};

export type NoteTag = {
	id: number;
	name: string;
};

const noteSelection = {
	bookName: books.name,
	content: notes.content,
	createdAt: notes.createdAt,
	id: notes.id,
	passageId: notes.passageId,
	passageTitle: passages.title,
	title: notes.title,
	updatedAt: notes.updatedAt,
};

/** Returns matching notes owned by the supplied user, newest first. */
export async function listNotes(
	db: DbClient,
	userId: string,
	input: ListNotesInput,
) {
	const conditions = [eq(notes.userId, userId)];

	if (input.bookId) conditions.push(eq(passages.bookId, input.bookId));
	if (input.collectionId) {
		const noteIdsForCollection = db
			.select({ noteId: collectionNotes.noteId })
			.from(collectionNotes)
			.innerJoin(collections, eq(collections.id, collectionNotes.collectionId))
			.where(
				and(
					eq(collectionNotes.collectionId, input.collectionId),
					eq(collections.userId, userId),
				),
			);
		conditions.push(inArray(notes.id, noteIdsForCollection));
	}
	if (input.passageId) conditions.push(eq(notes.passageId, input.passageId));
	if (input.tagId) {
		const noteIdsForTag = db
			.select({ noteId: noteTagAssignments.noteId })
			.from(noteTagAssignments)
			.innerJoin(userNoteTags, eq(userNoteTags.id, noteTagAssignments.tagId))
			.where(
				and(
					eq(noteTagAssignments.tagId, input.tagId),
					eq(userNoteTags.userId, userId),
				),
			);
		conditions.push(inArray(notes.id, noteIdsForTag));
	}
	if (input.query) {
		const query = `%${escapeLikePattern(input.query)}%`;
		const searchCondition = or(
			ilike(notes.title, query),
			ilike(notes.content, query),
			ilike(books.name, query),
			ilike(passages.title, query),
		);
		if (searchCondition) conditions.push(searchCondition);
	}

	const matchingNotes = await db
		.select(noteSelection)
		.from(notes)
		.leftJoin(passages, eq(passages.id, notes.passageId))
		.leftJoin(books, eq(books.id, passages.bookId))
		.where(and(...conditions))
		.orderBy(desc(notes.updatedAt), desc(notes.id));

	return addTagsToNotes(db, userId, matchingNotes);
}

/** Returns Scripture books that have at least one note owned by the user. */
export async function listNoteBooks(db: DbClient, userId: string) {
	return db
		.selectDistinct({ id: books.id, name: books.name })
		.from(notes)
		.innerJoin(passages, eq(passages.id, notes.passageId))
		.innerJoin(books, eq(books.id, passages.bookId))
		.where(eq(notes.userId, userId))
		.orderBy(asc(books.id));
}

/** Returns the authenticated user's tags that are currently attached to notes. */
export async function listNoteTags(db: DbClient, userId: string) {
	return db
		.selectDistinct({ id: userNoteTags.id, name: userNoteTags.name })
		.from(userNoteTags)
		.innerJoin(
			noteTagAssignments,
			eq(noteTagAssignments.tagId, userNoteTags.id),
		)
		.where(eq(userNoteTags.userId, userId))
		.orderBy(asc(userNoteTags.name));
}

/** Returns the authenticated user's note count for one conceptual passage. */
export async function countNotesForPassage(
	db: DbClient,
	userId: string,
	passageId: number,
) {
	const [result] = await db
		.select({ count: count() })
		.from(notes)
		.where(and(eq(notes.userId, userId), eq(notes.passageId, passageId)));

	return result?.count ?? 0;
}

/** Returns null when a note does not exist or belongs to a different user. */
export async function getNote(db: DbClient, userId: string, noteId: number) {
	const [note] = await db
		.select(noteSelection)
		.from(notes)
		.leftJoin(passages, eq(passages.id, notes.passageId))
		.leftJoin(books, eq(books.id, passages.bookId))
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.limit(1);

	if (!note) return null;

	const [noteWithTags] = await addTagsToNotes(db, userId, [note]);
	return noteWithTags;
}

/** Creates or reuses a private tag, then attaches it to the user's note. */
export async function addTagToNote(
	db: DbClient,
	userId: string,
	noteId: number,
	name: string,
): Promise<NoteTag> {
	await assertNoteOwned(db, userId, noteId);

	const tag = normalizeTag(name);
	await db
		.insert(userNoteTags)
		.values({
			name: tag.name,
			normalizedName: tag.normalizedName,
			userId,
		})
		.onConflictDoNothing();

	const [storedTag] = await db
		.select({ id: userNoteTags.id, name: userNoteTags.name })
		.from(userNoteTags)
		.where(
			and(
				eq(userNoteTags.userId, userId),
				eq(userNoteTags.normalizedName, tag.normalizedName),
			),
		)
		.limit(1);
	if (!storedTag) throw new Error("Unable to create note tag.");

	await db
		.insert(noteTagAssignments)
		.values({ noteId, tagId: storedTag.id })
		.onConflictDoNothing();

	return storedTag;
}

/** Returns false when the note does not exist, belongs to another user, or lacks the tag. */
export async function removeTagFromNote(
	db: DbClient,
	userId: string,
	noteId: number,
	tagId: number,
) {
	await assertNoteOwned(db, userId, noteId);

	const [removedTag] = await db
		.delete(noteTagAssignments)
		.where(
			and(
				eq(noteTagAssignments.noteId, noteId),
				eq(noteTagAssignments.tagId, tagId),
			),
		)
		.returning({ tagId: noteTagAssignments.tagId });

	return Boolean(removedTag);
}

/** Replaces every tag attached to a user's note with the supplied private tags. */
export async function setNoteTags(
	db: DbClient,
	userId: string,
	noteId: number,
	input: SetNoteTagsInput,
) {
	await assertNoteOwned(db, userId, noteId);

	const tags = normalizeTags(input.tags);

	return db.transaction((tx) => replaceNoteTags(tx, userId, noteId, tags));
}

export async function createNote(
	db: DbClient,
	userId: string,
	input: CreateNoteInput,
) {
	if (input.passageId !== null && input.passageId !== undefined) {
		await assertPassageExists(db, input.passageId);
	}

	const [note] = await db
		.insert(notes)
		.values({ ...input, userId })
		.returning();

	return note;
}

/** Returns null when a note does not exist or belongs to a different user. */
export async function updateNote(
	db: DbClient,
	userId: string,
	noteId: number,
	input: UpdateNoteInput,
) {
	if (input.passageId !== null && input.passageId !== undefined) {
		await assertPassageExists(db, input.passageId);
	}

	const [note] = await db
		.update(notes)
		.set(input)
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.returning();

	return note ?? null;
}

/** Creates or updates a note and replaces its tags as one atomic save. */
export async function saveNote(
	db: DbClient,
	userId: string,
	input: SaveNoteInput,
) {
	if (input.passageId !== null && input.passageId !== undefined) {
		await assertPassageExists(db, input.passageId);
	}

	const { id, tags: inputTags, ...noteInput } = input;
	const tags = normalizeTags(inputTags);

	return db.transaction(async (tx) => {
		const [note] =
			id === undefined
				? await tx
						.insert(notes)
						.values({ ...noteInput, userId })
						.returning()
				: await tx
						.update(notes)
						.set(noteInput)
						.where(and(eq(notes.id, id), eq(notes.userId, userId)))
						.returning();

		if (!note) return null;

		await replaceNoteTags(tx, userId, note.id, tags);
		return note;
	});
}

/** Returns false when a note does not exist or belongs to a different user. */
export async function deleteNote(db: DbClient, userId: string, noteId: number) {
	const [deletedNote] = await db
		.delete(notes)
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.returning({ id: notes.id });

	return Boolean(deletedNote);
}

async function assertPassageExists(db: DbClient, passageId: number) {
	const [passage] = await db
		.select({ id: passages.id })
		.from(passages)
		.where(eq(passages.id, passageId))
		.limit(1);

	if (!passage) throw new Error("Passage not found.");
}

async function assertNoteOwned(db: DbClient, userId: string, noteId: number) {
	const [note] = await db
		.select({ id: notes.id })
		.from(notes)
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.limit(1);

	if (!note) throw new Error("Note not found.");
}

async function addTagsToNotes<Note extends { id: number }>(
	db: DbClient,
	userId: string,
	notesToEnrich: Note[],
): Promise<Array<Note & { tags: NoteTag[] }>> {
	if (notesToEnrich.length === 0) return [];

	const tags = await db
		.select({
			id: userNoteTags.id,
			name: userNoteTags.name,
			noteId: noteTagAssignments.noteId,
		})
		.from(noteTagAssignments)
		.innerJoin(userNoteTags, eq(userNoteTags.id, noteTagAssignments.tagId))
		.innerJoin(notes, eq(notes.id, noteTagAssignments.noteId))
		.where(
			and(
				eq(notes.userId, userId),
				eq(userNoteTags.userId, userId),
				inArray(
					noteTagAssignments.noteId,
					notesToEnrich.map((note) => note.id),
				),
			),
		)
		.orderBy(asc(userNoteTags.name));
	const tagsByNoteId = new Map<number, NoteTag[]>();
	for (const tag of tags) {
		const noteTags = tagsByNoteId.get(tag.noteId) ?? [];
		noteTags.push({ id: tag.id, name: tag.name });
		tagsByNoteId.set(tag.noteId, noteTags);
	}

	return notesToEnrich.map((note) => ({
		...note,
		tags: tagsByNoteId.get(note.id) ?? [],
	}));
}

function normalizeTag(name: string) {
	const trimmedName = name.trim().replace(/\s+/g, " ");
	return { name: trimmedName, normalizedName: trimmedName.toLowerCase() };
}

function normalizeTags(names: string[]) {
	return Array.from(
		new Map(
			names.map((name) => {
				const tag = normalizeTag(name);
				return [tag.normalizedName, tag] as const;
			}),
		).values(),
	);
}

async function replaceNoteTags(
	tx: Parameters<Parameters<DbClient["transaction"]>[0]>[0],
	userId: string,
	noteId: number,
	tags: ReturnType<typeof normalizeTags>,
) {
	await tx
		.delete(noteTagAssignments)
		.where(eq(noteTagAssignments.noteId, noteId));

	if (tags.length === 0) return [];

	await tx
		.insert(userNoteTags)
		.values(
			tags.map((tag) => ({
				name: tag.name,
				normalizedName: tag.normalizedName,
				userId,
			})),
		)
		.onConflictDoNothing();

	const storedTags = await tx
		.select({ id: userNoteTags.id, name: userNoteTags.name })
		.from(userNoteTags)
		.where(
			and(
				eq(userNoteTags.userId, userId),
				inArray(
					userNoteTags.normalizedName,
					tags.map((tag) => tag.normalizedName),
				),
			),
		);

	await tx
		.insert(noteTagAssignments)
		.values(storedTags.map((tag) => ({ noteId, tagId: tag.id })));

	return storedTags;
}

function escapeLikePattern(value: string) {
	return value.replace(/[\\%_]/g, "\\$&");
}
