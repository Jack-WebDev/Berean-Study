import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { createDb } from "./index";
import { books } from "./schema/books";
import { collectionNotes } from "./schema/collection_notes";
import { collectionPassages } from "./schema/collection_passages";
import { collections } from "./schema/collections";
import { notes } from "./schema/notes";
import { passages } from "./schema/passages";

type DbClient = ReturnType<typeof createDb>;

const collectionSelection = {
	allowedContent: collections.allowedContent,
	coverId: collections.coverId,
	createdAt: collections.createdAt,
	description: collections.description,
	id: collections.id,
	name: collections.name,
	tags: collections.tags,
	updatedAt: collections.updatedAt,
};

export type CollectionContentType =
	| "passages"
	| "notes"
	| "highlights"
	| "study-themes";

export type CreateCollectionInput = {
	allowedContent: CollectionContentType[];
	coverId: string;
	description: string;
	name: string;
	tags: string[];
};

export type UpdateCollectionInput = CreateCollectionInput;

const collectionNoteSelection = {
	bookName: books.name,
	content: notes.content,
	id: notes.id,
	passageTitle: passages.title,
	updatedAt: notes.updatedAt,
};

/** Lists private collections owned by the supplied user, newest first. */
export async function listCollections(db: DbClient, userId: string) {
	return db
		.select(collectionSelection)
		.from(collections)
		.where(eq(collections.userId, userId))
		.orderBy(desc(collections.updatedAt), desc(collections.id));
}

/** Returns one private collection when it belongs to the supplied user. */
export async function getCollection(
	db: DbClient,
	userId: string,
	collectionId: number,
) {
	const [collection] = await db
		.select(collectionSelection)
		.from(collections)
		.where(
			and(eq(collections.id, collectionId), eq(collections.userId, userId)),
		)
		.limit(1);

	return collection ?? null;
}

/** Creates one private collection without creating or duplicating any study material. */
export async function createCollection(
	db: DbClient,
	userId: string,
	input: CreateCollectionInput,
) {
	const name = normalizeName(input.name);
	const tags = normalizeTags(input.tags);
	const [collection] = await db
		.insert(collections)
		.values({
			allowedContent: input.allowedContent,
			coverId: input.coverId,
			description: input.description.trim(),
			name: name.value,
			normalizedName: name.normalizedValue,
			tags,
			userId,
		})
		.onConflictDoNothing()
		.returning(collectionSelection);

	if (!collection) {
		const [existingCollection] = await db
			.select({ id: collections.id })
			.from(collections)
			.where(
				and(
					eq(collections.userId, userId),
					eq(collections.normalizedName, name.normalizedValue),
				),
			)
			.limit(1);

		if (existingCollection) {
			throw new Error("A collection with this name already exists.");
		}

		throw new Error("Unable to create collection.");
	}

	return collection;
}

/** Updates a private collection without changing its study material memberships. */
export async function updateCollection(
	db: DbClient,
	userId: string,
	collectionId: number,
	input: UpdateCollectionInput,
) {
	const name = normalizeName(input.name);
	const tags = normalizeTags(input.tags);
	await assertCollectionOwned(db, userId, collectionId);

	const [existingCollection] = await db
		.select({ id: collections.id })
		.from(collections)
		.where(
			and(
				eq(collections.userId, userId),
				eq(collections.normalizedName, name.normalizedValue),
			),
		)
		.limit(1);
	if (existingCollection && existingCollection.id !== collectionId) {
		throw new Error("A collection with this name already exists.");
	}

	const [collection] = await db
		.update(collections)
		.set({
			allowedContent: input.allowedContent,
			coverId: input.coverId,
			description: input.description.trim(),
			name: name.value,
			normalizedName: name.normalizedValue,
			tags,
			updatedAt: new Date(),
		})
		.where(
			and(eq(collections.id, collectionId), eq(collections.userId, userId)),
		)
		.returning(collectionSelection);

	if (!collection) throw new Error("Collection not found.");
	return collection;
}

/** Deletes a collection and its memberships, preserving the referenced study material. */
export async function deleteCollection(
	db: DbClient,
	userId: string,
	collectionId: number,
) {
	const [deletedCollection] = await db
		.delete(collections)
		.where(
			and(eq(collections.id, collectionId), eq(collections.userId, userId)),
		)
		.returning({ id: collections.id });

	return Boolean(deletedCollection);
}

/** Lists note-enabled collections and whether the supplied note is already included. */
export async function listCollectionsForNote(
	db: DbClient,
	userId: string,
	noteId: number,
) {
	await assertNoteOwned(db, userId, noteId);

	return db
		.select({
			id: collections.id,
			isSelected: collectionNotes.noteId,
			name: collections.name,
		})
		.from(collections)
		.leftJoin(
			collectionNotes,
			and(
				eq(collectionNotes.collectionId, collections.id),
				eq(collectionNotes.noteId, noteId),
			),
		)
		.where(
			and(
				eq(collections.userId, userId),
				sql`${collections.allowedContent} @> ARRAY['notes']::text[]`,
			),
		)
		.orderBy(collections.name);
}

/** Lists passage-enabled collections and whether the supplied passage is already included. */
export async function listCollectionsForPassage(
	db: DbClient,
	userId: string,
	passageId: number,
) {
	await assertPassageExists(db, passageId);

	return db
		.select({
			id: collections.id,
			isSelected: collectionPassages.passageId,
			name: collections.name,
		})
		.from(collections)
		.leftJoin(
			collectionPassages,
			and(
				eq(collectionPassages.collectionId, collections.id),
				eq(collectionPassages.passageId, passageId),
			),
		)
		.where(
			and(
				eq(collections.userId, userId),
				sql`${collections.allowedContent} @> ARRAY['passages']::text[]`,
			),
		)
		.orderBy(collections.name);
}

/** Replaces a note's collection memberships without modifying the note itself. */
export async function setCollectionsForNote(
	db: DbClient,
	userId: string,
	noteId: number,
	collectionIds: number[],
) {
	await assertNoteOwned(db, userId, noteId);
	const uniqueCollectionIds = [...new Set(collectionIds)];
	await assertCollectionsAvailableForContent(
		db,
		userId,
		uniqueCollectionIds,
		"notes",
	);

	await db.transaction(async (tx) => {
		await tx.delete(collectionNotes).where(eq(collectionNotes.noteId, noteId));
		if (uniqueCollectionIds.length > 0) {
			await tx
				.insert(collectionNotes)
				.values(
					uniqueCollectionIds.map((collectionId) => ({ collectionId, noteId })),
				);
		}
	});
}

/** Replaces a passage's collection memberships without copying the Scripture text. */
export async function setCollectionsForPassage(
	db: DbClient,
	userId: string,
	passageId: number,
	collectionIds: number[],
) {
	await assertPassageExists(db, passageId);
	const uniqueCollectionIds = [...new Set(collectionIds)];
	await assertCollectionsAvailableForContent(
		db,
		userId,
		uniqueCollectionIds,
		"passages",
	);

	await db.transaction(async (tx) => {
		const ownedCollectionIds = tx
			.select({ id: collections.id })
			.from(collections)
			.where(eq(collections.userId, userId));

		await tx
			.delete(collectionPassages)
			.where(
				and(
					eq(collectionPassages.passageId, passageId),
					inArray(collectionPassages.collectionId, ownedCollectionIds),
				),
			);
		if (uniqueCollectionIds.length > 0) {
			await tx.insert(collectionPassages).values(
				uniqueCollectionIds.map((collectionId) => ({
					collectionId,
					passageId,
				})),
			);
		}
	});
}

/** Lists notes referenced by a collection, without duplicating their content. */
export async function listCollectionNotes(
	db: DbClient,
	userId: string,
	collectionId: number,
) {
	await assertCollectionOwned(db, userId, collectionId);
	return db
		.select(collectionNoteSelection)
		.from(collectionNotes)
		.innerJoin(notes, eq(notes.id, collectionNotes.noteId))
		.innerJoin(passages, eq(passages.id, notes.passageId))
		.innerJoin(books, eq(books.id, passages.bookId))
		.where(
			and(
				eq(collectionNotes.collectionId, collectionId),
				eq(notes.userId, userId),
			),
		)
		.orderBy(desc(notes.updatedAt), desc(notes.id));
}

/** Lists the existing Scripture passages referenced by a collection. */
export async function listCollectionPassages(
	db: DbClient,
	userId: string,
	collectionId: number,
) {
	await assertCollectionOwned(db, userId, collectionId);
	return db
		.select({ id: passages.id, title: passages.title })
		.from(collectionPassages)
		.innerJoin(passages, eq(passages.id, collectionPassages.passageId))
		.where(eq(collectionPassages.collectionId, collectionId))
		.orderBy(passages.id);
}

/** Removes a collection membership while preserving the underlying note. */
export async function removeNoteFromCollection(
	db: DbClient,
	userId: string,
	collectionId: number,
	noteId: number,
) {
	await assertCollectionOwned(db, userId, collectionId);
	await assertNoteOwned(db, userId, noteId);
	const [removed] = await db
		.delete(collectionNotes)
		.where(
			and(
				eq(collectionNotes.collectionId, collectionId),
				eq(collectionNotes.noteId, noteId),
			),
		)
		.returning({ noteId: collectionNotes.noteId });
	return Boolean(removed);
}

async function assertNoteOwned(db: DbClient, userId: string, noteId: number) {
	const [note] = await db
		.select({ id: notes.id })
		.from(notes)
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.limit(1);
	if (!note) throw new Error("Note not found.");
}

async function assertPassageExists(db: DbClient, passageId: number) {
	const [passage] = await db
		.select({ id: passages.id })
		.from(passages)
		.where(eq(passages.id, passageId))
		.limit(1);
	if (!passage) throw new Error("Passage not found.");
}

async function assertCollectionsAvailableForContent(
	db: DbClient,
	userId: string,
	collectionIds: number[],
	contentType: CollectionContentType,
) {
	if (collectionIds.length === 0) return;
	const ownedCollections = await db
		.select({ id: collections.id })
		.from(collections)
		.where(
			and(
				eq(collections.userId, userId),
				inArray(collections.id, collectionIds),
				sql`${collections.allowedContent} @> ARRAY[${contentType}]::text[]`,
			),
		);
	if (ownedCollections.length !== collectionIds.length) {
		throw new Error("One or more collections are unavailable.");
	}
}

async function assertCollectionOwned(
	db: DbClient,
	userId: string,
	collectionId: number,
) {
	const [collection] = await db
		.select({ id: collections.id })
		.from(collections)
		.where(
			and(eq(collections.id, collectionId), eq(collections.userId, userId)),
		)
		.limit(1);
	if (!collection) throw new Error("Collection not found.");
}

function normalizeName(value: string) {
	const normalizedValue = value.trim().replace(/\s+/g, " ").toLowerCase();
	return { normalizedValue, value: value.trim().replace(/\s+/g, " ") };
}

function normalizeTags(tags: string[]) {
	return Array.from(
		new Map(
			tags.map((tag) => {
				const value = tag.trim().replace(/\s+/g, " ");
				return [value.toLowerCase(), value] as const;
			}),
		).values(),
	);
}
