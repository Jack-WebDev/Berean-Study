import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { db } from "./index";
import {
	getPassageExcerpts,
	getPreferredTranslation,
	type PassageExcerpt,
} from "./passages";
import { parseStoredRichText } from "./rich-text-storage";
import { books } from "./schema/books";
import { collectionNotes } from "./schema/collection_notes";
import { collectionPassages } from "./schema/collection_passages";
import { collectionSections } from "./schema/collection_sections";
import {
	type CollectionType,
	type CollectionVisibility,
	collections,
} from "./schema/collections";
import { notePassages } from "./schema/note_passages";
import { notes } from "./schema/notes";
import { passages } from "./schema/passages";

type DbClient = typeof db;
type Transaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export type { CollectionType, CollectionVisibility };

export type CollectionInput = {
	color: string;
	description: string;
	name: string;
	tags: readonly string[];
	type: CollectionType;
	visibility: CollectionVisibility;
};

/** The cover shows the first passage's reference and opening verse. */
export type CollectionCover = {
	passageId: number;
	reference: string;
	text: string | null;
};

export type CollectionSummary = {
	color: string;
	cover: CollectionCover | null;
	createdAt: Date;
	description: string;
	id: number;
	lastOpenedAt: Date | null;
	name: string;
	noteCount: number;
	passageCount: number;
	pinned: boolean;
	/** Percent of passages read, for study projects only. */
	progress: number | null;
	readCount: number;
	tags: readonly string[];
	type: CollectionType;
	updatedAt: Date;
	visibility: CollectionVisibility;
};

/** The study project the member was last working in, and what to read next. */
export type ContinueStudying = {
	collectionId: number;
	next: CollectionCover;
	/** The abbreviation of the translation the verse is quoted from. */
	translation: string | null;
};

export type CollectionLibrary = {
	collections: CollectionSummary[];
	continueStudying: ContinueStudying | null;
};

/** A group of passages for `arrangeCollectionPassages`; `null` is unsectioned. */
export type PassageGroup = {
	passageIds: number[];
	sectionId: number | null;
};

const collectionSelection = {
	color: collections.color,
	createdAt: collections.createdAt,
	description: collections.description,
	id: collections.id,
	lastOpenedAt: collections.lastOpenedAt,
	name: collections.name,
	pinnedAt: collections.pinnedAt,
	tags: collections.tags,
	type: collections.type,
	updatedAt: collections.updatedAt,
	visibility: collections.visibility,
};

type CollectionRow = {
	color: string;
	createdAt: Date;
	description: string;
	id: number;
	lastOpenedAt: Date | null;
	name: string;
	pinnedAt: Date | null;
	tags: readonly string[];
	type: CollectionType;
	updatedAt: Date;
	visibility: CollectionVisibility;
};

type MembershipRow = {
	collectionId: number;
	passageId: number;
	position: number;
	readAt: Date | null;
	sectionPosition: number | null;
};

const collectionNoteSelection = {
	bookName: books.name,
	content: notes.content,
	id: notes.id,
	passageTitle: passages.title,
	status: notes.status,
	title: notes.title,
	updatedAt: notes.updatedAt,
};

/**
 * Lists the member's collections with everything a library card shows, plus
 * the study project to offer under "Continue studying".
 */
export async function getCollectionLibrary(
	db: DbClient,
	userId: string,
): Promise<CollectionLibrary> {
	const [rows, memberships, noteCounts, translation] = await Promise.all([
		db
			.select(collectionSelection)
			.from(collections)
			.where(eq(collections.userId, userId))
			.orderBy(desc(collections.updatedAt), desc(collections.id)),
		db
			.select({
				collectionId: collectionPassages.collectionId,
				passageId: collectionPassages.passageId,
				position: collectionPassages.position,
				readAt: collectionPassages.readAt,
				sectionPosition: collectionSections.position,
			})
			.from(collectionPassages)
			.innerJoin(
				collections,
				eq(collections.id, collectionPassages.collectionId),
			)
			.leftJoin(
				collectionSections,
				eq(collectionSections.id, collectionPassages.sectionId),
			)
			.where(eq(collections.userId, userId)),
		db
			.select({
				collectionId: collectionNotes.collectionId,
				count: count(),
			})
			.from(collectionNotes)
			.innerJoin(notes, eq(notes.id, collectionNotes.noteId))
			.where(eq(notes.userId, userId))
			.groupBy(collectionNotes.collectionId),
		getPreferredTranslation(db, userId),
	]);

	const membershipsByCollection = new Map<number, MembershipRow[]>();
	for (const membership of [...memberships].sort(compareReadingOrder)) {
		const list = membershipsByCollection.get(membership.collectionId) ?? [];
		list.push(membership);
		membershipsByCollection.set(membership.collectionId, list);
	}
	const noteCountByCollection = new Map(
		noteCounts.map((row) => [row.collectionId, row.count]),
	);

	const [continueRow] = rows
		.filter((row) => {
			const ordered = membershipsByCollection.get(row.id) ?? [];
			return (
				row.type === "project" &&
				row.lastOpenedAt !== null &&
				ordered.some((membership) => membership.readAt === null)
			);
		})
		.sort(
			(left, right) =>
				(right.lastOpenedAt?.getTime() ?? 0) -
				(left.lastOpenedAt?.getTime() ?? 0),
		);
	const nextPassageId = continueRow
		? membershipsByCollection
				.get(continueRow.id)
				?.find((membership) => membership.readAt === null)?.passageId
		: undefined;

	const coverPassageIds = rows
		.map((row) => membershipsByCollection.get(row.id)?.[0]?.passageId)
		.filter((id) => id !== undefined);
	const excerpts = await getPassageExcerpts(
		db,
		nextPassageId ? [...coverPassageIds, nextPassageId] : coverPassageIds,
		translation?.id ?? null,
		1,
	);

	return {
		collections: rows.map((row) =>
			toCollectionSummary(
				row,
				membershipsByCollection.get(row.id) ?? [],
				noteCountByCollection.get(row.id) ?? 0,
				excerpts,
			),
		),
		continueStudying:
			continueRow && nextPassageId
				? {
						collectionId: continueRow.id,
						next: toCover(nextPassageId, excerpts),
						translation: translation?.abbreviation ?? null,
					}
				: null,
	};
}

/** Lists the user's collections for the note pickers, by name. */
export async function listCollectionsForNotes(db: DbClient, userId: string) {
	return db
		.select({ id: collections.id, name: collections.name })
		.from(collections)
		.where(eq(collections.userId, userId))
		.orderBy(collections.name);
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

/**
 * Returns a collection with its sections, its passages in reading order (each
 * with its opening verses and read state), and the notes collected in it.
 */
export async function getCollectionDetail(
	db: DbClient,
	userId: string,
	collectionId: number,
) {
	const collection = await getCollection(db, userId, collectionId);
	if (!collection) return null;

	const [sections, memberships, collectedNotes, translation] =
		await Promise.all([
			db
				.select({
					id: collectionSections.id,
					position: collectionSections.position,
					title: collectionSections.title,
				})
				.from(collectionSections)
				.where(eq(collectionSections.collectionId, collectionId))
				.orderBy(asc(collectionSections.position), asc(collectionSections.id)),
			db
				.select({
					addedAt: collectionPassages.addedAt,
					collectionId: collectionPassages.collectionId,
					passageId: collectionPassages.passageId,
					position: collectionPassages.position,
					readAt: collectionPassages.readAt,
					sectionId: collectionPassages.sectionId,
					sectionPosition: collectionSections.position,
				})
				.from(collectionPassages)
				.leftJoin(
					collectionSections,
					eq(collectionSections.id, collectionPassages.sectionId),
				)
				.where(eq(collectionPassages.collectionId, collectionId)),
			listNotesForCollection(db, userId, collectionId),
			getPreferredTranslation(db, userId),
		]);

	const ordered = [...memberships].sort(compareReadingOrder);
	const excerpts = await getPassageExcerpts(
		db,
		ordered.map((membership) => membership.passageId),
		translation?.id ?? null,
		3,
	);

	return {
		collection: toCollectionSummary(
			collection,
			ordered,
			collectedNotes.length,
			excerpts,
		),
		notes: collectedNotes,
		passages: ordered.map((membership) => {
			const excerpt = excerpts.get(membership.passageId);
			return {
				addedAt: membership.addedAt,
				passageId: membership.passageId,
				readAt: membership.readAt,
				reference: excerpt?.reference ?? "Passage unavailable",
				sectionId: membership.sectionId,
				title: excerpt?.title ?? null,
				verses: excerpt?.verses ?? [],
			};
		}),
		sections: sections.map(({ id, title }) => ({ id, title })),
		translation: translation?.abbreviation ?? null,
	};
}

/** Creates one private collection without creating or duplicating any study material. */
export async function createCollection(
	db: DbClient,
	userId: string,
	input: CollectionInput,
) {
	const name = normalizeName(input.name);
	const [collection] = await db
		.insert(collections)
		.values({
			color: input.color,
			description: input.description.trim(),
			name: name.value,
			normalizedName: name.normalizedValue,
			tags: normalizeTags(input.tags),
			type: input.type,
			userId,
			visibility: input.visibility,
		})
		.onConflictDoNothing()
		.returning({ id: collections.id, name: collections.name });

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

/** Updates a collection's details without changing what it contains. */
export async function updateCollection(
	db: DbClient,
	userId: string,
	collectionId: number,
	input: CollectionInput,
) {
	const name = normalizeName(input.name);
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
			color: input.color,
			description: input.description.trim(),
			name: name.value,
			normalizedName: name.normalizedValue,
			tags: normalizeTags(input.tags),
			type: input.type,
			updatedAt: new Date(),
			visibility: input.visibility,
		})
		.where(
			and(eq(collections.id, collectionId), eq(collections.userId, userId)),
		)
		.returning({ id: collections.id, name: collections.name });

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

/** Pins or unpins a collection. Pinning isn't an edit, so "updated" stays put. */
export async function setCollectionPinned(
	db: DbClient,
	userId: string,
	collectionId: number,
	pinned: boolean,
) {
	const [collection] = await db
		.update(collections)
		.set({
			pinnedAt: pinned ? new Date() : null,
			updatedAt: sql`${collections.updatedAt}`,
		})
		.where(
			and(eq(collections.id, collectionId), eq(collections.userId, userId)),
		)
		.returning({ id: collections.id });
	if (!collection) throw new Error("Collection not found.");
}

/** Records a visit so "Continue studying" can offer the latest project. */
export async function markCollectionOpened(
	db: DbClient,
	userId: string,
	collectionId: number,
) {
	await db
		.update(collections)
		.set({
			lastOpenedAt: new Date(),
			updatedAt: sql`${collections.updatedAt}`,
		})
		.where(
			and(eq(collections.id, collectionId), eq(collections.userId, userId)),
		);
}

/** Adds a passage at the end of a section, or of the unsectioned passages. */
export async function addPassageToCollection(
	db: DbClient,
	userId: string,
	collectionId: number,
	passageId: number,
	sectionId: number | null,
) {
	await assertCollectionOwned(db, userId, collectionId);
	await assertPassageExists(db, passageId);
	if (sectionId !== null) {
		await assertSectionInCollection(db, collectionId, sectionId);
	}

	await db.transaction(async (tx) => {
		const position = await nextPassagePosition(tx, collectionId, sectionId);
		const [added] = await tx
			.insert(collectionPassages)
			.values({ collectionId, passageId, position, sectionId })
			.onConflictDoNothing()
			.returning({ passageId: collectionPassages.passageId });
		if (!added) throw new Error("This passage is already in the collection.");
		await touchCollection(tx, collectionId);
	});
}

/** Removes a passage from a collection, preserving the passage itself. */
export async function removePassageFromCollection(
	db: DbClient,
	userId: string,
	collectionId: number,
	passageId: number,
) {
	await assertCollectionOwned(db, userId, collectionId);
	return db.transaction(async (tx) => {
		const [removed] = await tx
			.delete(collectionPassages)
			.where(
				and(
					eq(collectionPassages.collectionId, collectionId),
					eq(collectionPassages.passageId, passageId),
				),
			)
			.returning({ sectionId: collectionPassages.sectionId });
		if (!removed) return false;
		await renumberPassages(tx, collectionId, removed.sectionId);
		await touchCollection(tx, collectionId);
		return true;
	});
}

/**
 * Saves the member's arrangement of passages after a drag. `groups` must list
 * every passage in the collection exactly once; anything else is refused so a
 * stale page can't drop or duplicate passages.
 */
export async function arrangeCollectionPassages(
	db: DbClient,
	userId: string,
	collectionId: number,
	groups: PassageGroup[],
) {
	await assertCollectionOwned(db, userId, collectionId);
	const [sections, memberships] = await Promise.all([
		db
			.select({ id: collectionSections.id })
			.from(collectionSections)
			.where(eq(collectionSections.collectionId, collectionId)),
		db
			.select({
				passageId: collectionPassages.passageId,
				position: collectionPassages.position,
				sectionId: collectionPassages.sectionId,
			})
			.from(collectionPassages)
			.where(eq(collectionPassages.collectionId, collectionId)),
	]);

	const sectionIds = new Set(sections.map((section) => section.id));
	const groupKeys = groups.map((group) => group.sectionId);
	if (
		new Set(groupKeys).size !== groupKeys.length ||
		groupKeys.some((id) => id !== null && !sectionIds.has(id))
	) {
		throw new Error("The collection's sections have changed.");
	}
	const arrangedIds = groups.flatMap((group) => group.passageIds);
	const currentIds = new Set(memberships.map((row) => row.passageId));
	if (
		arrangedIds.length !== currentIds.size ||
		new Set(arrangedIds).size !== arrangedIds.length ||
		arrangedIds.some((id) => !currentIds.has(id))
	) {
		throw new Error("The collection's passages have changed.");
	}

	const current = new Map(memberships.map((row) => [row.passageId, row]));
	const changes = groups.flatMap((group) =>
		group.passageIds
			.map((passageId, position) => ({
				passageId,
				position,
				sectionId: group.sectionId,
			}))
			.filter((change) => {
				const before = current.get(change.passageId);
				return (
					before?.position !== change.position ||
					before.sectionId !== change.sectionId
				);
			}),
	);
	if (changes.length === 0) return;

	await db.transaction(async (tx) => {
		for (const change of changes) {
			await tx
				.update(collectionPassages)
				.set({ position: change.position, sectionId: change.sectionId })
				.where(
					and(
						eq(collectionPassages.collectionId, collectionId),
						eq(collectionPassages.passageId, change.passageId),
					),
				);
		}
		await touchCollection(tx, collectionId);
	});
}

/** Marks a collected passage read or unread. Reading isn't an edit. */
export async function setCollectionPassageRead(
	db: DbClient,
	userId: string,
	collectionId: number,
	passageId: number,
	read: boolean,
) {
	await assertCollectionOwned(db, userId, collectionId);
	const [updated] = await db
		.update(collectionPassages)
		.set({ readAt: read ? new Date() : null })
		.where(
			and(
				eq(collectionPassages.collectionId, collectionId),
				eq(collectionPassages.passageId, passageId),
			),
		)
		.returning({ passageId: collectionPassages.passageId });
	if (!updated) throw new Error("Passage not found in this collection.");
}

/** Adds an empty section after the existing ones. */
export async function createCollectionSection(
	db: DbClient,
	userId: string,
	collectionId: number,
	title: string,
) {
	await assertCollectionOwned(db, userId, collectionId);
	return db.transaction(async (tx) => {
		const [existing] = await tx
			.select({ total: count() })
			.from(collectionSections)
			.where(eq(collectionSections.collectionId, collectionId));
		const [section] = await tx
			.insert(collectionSections)
			.values({
				collectionId,
				position: existing?.total ?? 0,
				title: title.trim(),
			})
			.returning({
				id: collectionSections.id,
				title: collectionSections.title,
			});
		await touchCollection(tx, collectionId);
		return section;
	});
}

export async function renameCollectionSection(
	db: DbClient,
	userId: string,
	collectionId: number,
	sectionId: number,
	title: string,
) {
	await assertCollectionOwned(db, userId, collectionId);
	await db.transaction(async (tx) => {
		const [renamed] = await tx
			.update(collectionSections)
			.set({ title: title.trim() })
			.where(
				and(
					eq(collectionSections.id, sectionId),
					eq(collectionSections.collectionId, collectionId),
				),
			)
			.returning({ id: collectionSections.id });
		if (!renamed) throw new Error("Section not found.");
		await touchCollection(tx, collectionId);
	});
}

/** Moves a section to a new place among the collection's sections. */
export async function moveCollectionSection(
	db: DbClient,
	userId: string,
	collectionId: number,
	sectionId: number,
	toIndex: number,
) {
	await assertCollectionOwned(db, userId, collectionId);
	await db.transaction(async (tx) => {
		const sections = await tx
			.select({ id: collectionSections.id })
			.from(collectionSections)
			.where(eq(collectionSections.collectionId, collectionId))
			.orderBy(asc(collectionSections.position), asc(collectionSections.id));
		const fromIndex = sections.findIndex((section) => section.id === sectionId);
		if (fromIndex === -1) throw new Error("Section not found.");

		const ordered = sections.map((section) => section.id);
		ordered.splice(fromIndex, 1);
		ordered.splice(
			Math.min(Math.max(toIndex, 0), ordered.length),
			0,
			sectionId,
		);
		for (const [position, id] of ordered.entries()) {
			await tx
				.update(collectionSections)
				.set({ position })
				.where(eq(collectionSections.id, id));
		}
		await touchCollection(tx, collectionId);
	});
}

/**
 * Deletes a section but keeps its passages: they move, in order, to the end
 * of the collection's unsectioned passages.
 */
export async function deleteCollectionSection(
	db: DbClient,
	userId: string,
	collectionId: number,
	sectionId: number,
) {
	await assertCollectionOwned(db, userId, collectionId);
	await assertSectionInCollection(db, collectionId, sectionId);
	await db.transaction(async (tx) => {
		const start = await nextPassagePosition(tx, collectionId, null);
		await tx.execute(sql`
			UPDATE ${collectionPassages}
			SET "section_id" = NULL, "position" = ${start} + "moved"."offset"
			FROM (
				SELECT "passage_id",
					row_number() OVER (ORDER BY "position", "passage_id") - 1 AS "offset"
				FROM ${collectionPassages}
				WHERE "collection_id" = ${collectionId} AND "section_id" = ${sectionId}
			) AS "moved"
			WHERE ${collectionPassages.collectionId} = ${collectionId}
				AND ${collectionPassages.passageId} = "moved"."passage_id"
		`);
		await tx
			.delete(collectionSections)
			.where(eq(collectionSections.id, sectionId));
		await tx.execute(sql`
			UPDATE ${collectionSections}
			SET "position" = "ordered"."position"
			FROM (
				SELECT "id", row_number() OVER (ORDER BY "position", "id") - 1 AS "position"
				FROM ${collectionSections}
				WHERE "collection_id" = ${collectionId}
			) AS "ordered"
			WHERE ${collectionSections.id} = "ordered"."id"
		`);
		await touchCollection(tx, collectionId);
	});
}

/** Lists collections and whether the supplied note is already included. */
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
		.where(eq(collections.userId, userId))
		.orderBy(collections.name);
}

/** Lists collections and whether the supplied passage is already included. */
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
		.where(eq(collections.userId, userId))
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
	await assertCollectionsOwned(db, userId, uniqueCollectionIds);

	await db.transaction(async (tx) => {
		const ownedCollectionIds = tx
			.select({ id: collections.id })
			.from(collections)
			.where(eq(collections.userId, userId));

		await tx
			.delete(collectionNotes)
			.where(
				and(
					eq(collectionNotes.noteId, noteId),
					inArray(collectionNotes.collectionId, ownedCollectionIds),
				),
			);
		if (uniqueCollectionIds.length > 0) {
			await tx
				.insert(collectionNotes)
				.values(
					uniqueCollectionIds.map((collectionId) => ({ collectionId, noteId })),
				);
		}
	});
}

/**
 * Changes which collections hold a passage. Collections that keep the passage
 * keep its section, place and read state; new ones get it at the end.
 */
export async function setCollectionsForPassage(
	db: DbClient,
	userId: string,
	passageId: number,
	collectionIds: number[],
) {
	await assertPassageExists(db, passageId);
	const wantedIds = new Set(collectionIds);
	await assertCollectionsOwned(db, userId, [...wantedIds]);

	await db.transaction(async (tx) => {
		const current = await tx
			.select({
				collectionId: collectionPassages.collectionId,
				sectionId: collectionPassages.sectionId,
			})
			.from(collectionPassages)
			.innerJoin(
				collections,
				eq(collections.id, collectionPassages.collectionId),
			)
			.where(
				and(
					eq(collectionPassages.passageId, passageId),
					eq(collections.userId, userId),
				),
			);
		const currentIds = new Set(current.map((row) => row.collectionId));

		for (const row of current) {
			if (wantedIds.has(row.collectionId)) continue;
			await tx
				.delete(collectionPassages)
				.where(
					and(
						eq(collectionPassages.collectionId, row.collectionId),
						eq(collectionPassages.passageId, passageId),
					),
				);
			await renumberPassages(tx, row.collectionId, row.sectionId);
			await touchCollection(tx, row.collectionId);
		}
		for (const collectionId of wantedIds) {
			if (currentIds.has(collectionId)) continue;
			const position = await nextPassagePosition(tx, collectionId, null);
			await tx
				.insert(collectionPassages)
				.values({ collectionId, passageId, position });
			await touchCollection(tx, collectionId);
		}
	});
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

async function listNotesForCollection(
	db: DbClient,
	userId: string,
	collectionId: number,
) {
	const matchingNotes = await db
		.select(collectionNoteSelection)
		.from(collectionNotes)
		.innerJoin(notes, eq(notes.id, collectionNotes.noteId))
		.leftJoin(
			notePassages,
			and(eq(notePassages.noteId, notes.id), eq(notePassages.position, 0)),
		)
		.leftJoin(passages, eq(passages.id, notePassages.passageId))
		.leftJoin(books, eq(books.id, passages.bookId))
		.where(
			and(
				eq(collectionNotes.collectionId, collectionId),
				eq(notes.userId, userId),
			),
		)
		.orderBy(desc(notes.updatedAt), desc(notes.id));

	// Every passage a note is linked to, so it can sit under each of them.
	const links = matchingNotes.length
		? await db
				.select({
					noteId: notePassages.noteId,
					passageId: notePassages.passageId,
				})
				.from(notePassages)
				.where(
					inArray(
						notePassages.noteId,
						matchingNotes.map((note) => note.id),
					),
				)
		: [];

	return matchingNotes.map((note) => ({
		...note,
		content: parseStoredRichText(note.content),
		passageIds: links
			.filter((link) => link.noteId === note.id)
			.map((link) => link.passageId),
	}));
}

/** Unsectioned passages come first, then each section in order. */
function compareReadingOrder(left: MembershipRow, right: MembershipRow) {
	return (
		(left.sectionPosition ?? -1) - (right.sectionPosition ?? -1) ||
		left.position - right.position ||
		left.passageId - right.passageId
	);
}

function toCover(
	passageId: number,
	excerpts: Map<number, PassageExcerpt>,
): CollectionCover {
	const excerpt = excerpts.get(passageId);
	return {
		passageId,
		reference: excerpt?.reference ?? "Passage unavailable",
		text: excerpt?.verses[0]?.text ?? null,
	};
}

function toCollectionSummary(
	row: CollectionRow,
	orderedMemberships: readonly Pick<MembershipRow, "passageId" | "readAt">[],
	noteCount: number,
	excerpts: Map<number, PassageExcerpt>,
): CollectionSummary {
	const { pinnedAt, ...collection } = row;
	const passageCount = orderedMemberships.length;
	const readCount = orderedMemberships.filter(
		(membership) => membership.readAt !== null,
	).length;
	const firstPassageId = orderedMemberships[0]?.passageId;

	return {
		...collection,
		cover: firstPassageId ? toCover(firstPassageId, excerpts) : null,
		noteCount,
		passageCount,
		pinned: pinnedAt !== null,
		progress:
			row.type === "project"
				? passageCount
					? Math.round((readCount / passageCount) * 100)
					: 0
				: null,
		readCount,
	};
}

/** Content changes count as an update; reading and pinning don't. */
async function touchCollection(tx: Transaction, collectionId: number) {
	await tx
		.update(collections)
		.set({ updatedAt: new Date() })
		.where(eq(collections.id, collectionId));
}

async function nextPassagePosition(
	tx: Transaction,
	collectionId: number,
	sectionId: number | null,
) {
	const [row] = await tx
		.select({
			next: sql<number>`coalesce(max(${collectionPassages.position}) + 1, 0)::int`,
		})
		.from(collectionPassages)
		.where(
			and(
				eq(collectionPassages.collectionId, collectionId),
				sectionId === null
					? isNull(collectionPassages.sectionId)
					: eq(collectionPassages.sectionId, sectionId),
			),
		);
	return row?.next ?? 0;
}

/** Closes the gap a removed passage leaves in its group. */
async function renumberPassages(
	tx: Transaction,
	collectionId: number,
	sectionId: number | null,
) {
	const inGroup =
		sectionId === null
			? sql`"section_id" IS NULL`
			: sql`"section_id" = ${sectionId}`;
	await tx.execute(sql`
		UPDATE ${collectionPassages}
		SET "position" = "ordered"."position"
		FROM (
			SELECT "passage_id",
				row_number() OVER (ORDER BY "position", "passage_id") - 1 AS "position"
			FROM ${collectionPassages}
			WHERE "collection_id" = ${collectionId} AND ${inGroup}
		) AS "ordered"
		WHERE ${collectionPassages.collectionId} = ${collectionId}
			AND ${collectionPassages.passageId} = "ordered"."passage_id"
	`);
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

async function assertSectionInCollection(
	db: DbClient,
	collectionId: number,
	sectionId: number,
) {
	const [section] = await db
		.select({ id: collectionSections.id })
		.from(collectionSections)
		.where(
			and(
				eq(collectionSections.id, sectionId),
				eq(collectionSections.collectionId, collectionId),
			),
		)
		.limit(1);
	if (!section) throw new Error("Section not found.");
}

async function assertCollectionsOwned(
	db: DbClient,
	userId: string,
	collectionIds: number[],
) {
	if (collectionIds.length === 0) return;
	const ownedCollections = await db
		.select({ id: collections.id })
		.from(collections)
		.where(
			and(
				eq(collections.userId, userId),
				inArray(collections.id, collectionIds),
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

function normalizeTags(tags: readonly string[]) {
	return Array.from(
		new Map(
			tags.map((tag) => {
				const value = tag.trim().replace(/\s+/g, " ");
				return [value.toLowerCase(), value] as const;
			}),
		).values(),
	);
}
