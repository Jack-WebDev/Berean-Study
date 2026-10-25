import {
	getDocumentSections,
	getDocumentText,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	or,
	type SQL,
	sql,
} from "drizzle-orm";

import type { db } from "./index";
import {
	parseStoredRichText,
	serializeRichTextDocument,
} from "./rich-text-storage";
import { books } from "./schema/books";
import { collectionNotes } from "./schema/collection_notes";
import { collections } from "./schema/collections";
import { notePassages } from "./schema/note_passages";
import { noteTagAssignments, userNoteTags } from "./schema/note_tags";
import { noteVersions } from "./schema/note_versions";
import { notes } from "./schema/notes";
import { passages } from "./schema/passages";

type DbClient = typeof db;
type Transaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export type NoteStatus = "draft" | "saved";

export const notePurposes = [
	"observation",
	"reflection",
	"application",
	"prayer",
] as const;

export type NotePurpose = (typeof notePurposes)[number];

export type SaveNoteInput = {
	content: RichTextDocument;
	id?: number;
	/** Linked passages in display order; the first is the note's main passage. */
	passageIds: number[];
	/** Omit to keep the stored purpose; null clears it. */
	purpose?: NotePurpose | null;
	/** Omit to keep the stored status; new notes start as drafts. */
	status?: NoteStatus;
	tags: string[];
	title: string;
};

export type SetNoteTagsInput = {
	tags: string[];
};

export type NoteSort = "created" | "title" | "updated";

/** The library's tabs: every note, drafts only, or notes with a passage. */
export type NoteView = "all" | "drafts" | "linked";

/**
 * Filters within one list (several books, say) match any of them; filters of
 * different kinds must all match.
 */
export type ListNotesInput = {
	bookIds?: number[];
	collectionIds?: number[];
	passageId?: number;
	query?: string;
	sort?: NoteSort;
	tagIds?: number[];
	view?: NoteView;
};

export type NoteTag = {
	id: number;
	name: string;
};

export type NotePassage = {
	id: number;
	label: string;
};

/** Main passage columns come from the note's first linked passage. */
const noteSelection = {
	bookName: books.name,
	content: notes.content,
	createdAt: notes.createdAt,
	id: notes.id,
	passageId: notePassages.passageId,
	passageTitle: passages.title,
	pinnedAt: notes.pinnedAt,
	purpose: notes.purpose,
	status: notes.status,
	title: notes.title,
	updatedAt: notes.updatedAt,
};

const mainPassageJoin = and(
	eq(notePassages.noteId, notes.id),
	eq(notePassages.position, 0),
);

/** A new note version is written at most this often while typing. */
const VERSION_INTERVAL_MS = 5 * 60 * 1000;

const isLinked = sql`exists (select 1 from ${notePassages} where ${notePassages.noteId} = ${notes.id})`;

const viewConditions: Record<NoteView, SQL | undefined> = {
	all: undefined,
	drafts: eq(notes.status, "draft"),
	linked: isLinked,
};

const sortOrders: Record<NoteSort, SQL[]> = {
	created: [desc(notes.createdAt), desc(notes.id)],
	// Untitled notes sort by their first words, which is what the list shows.
	title: [
		asc(
			sql`lower(coalesce(nullif(btrim(${notes.title}), ''), ${notes.searchText}))`,
		),
		desc(notes.updatedAt),
	],
	updated: [desc(notes.updatedAt), desc(notes.id)],
};

/** Returns matching notes owned by the supplied user, recently edited first by default. */
export async function listNotes(
	db: DbClient,
	userId: string,
	input: ListNotesInput,
) {
	const matchingNotes = await db
		.select(noteSelection)
		.from(notes)
		.leftJoin(notePassages, mainPassageJoin)
		.leftJoin(passages, eq(passages.id, notePassages.passageId))
		.leftJoin(books, eq(books.id, passages.bookId))
		.where(
			and(
				...noteFilterConditions(db, userId, input),
				viewConditions[input.view ?? "all"],
			),
		)
		.orderBy(...sortOrders[input.sort ?? "updated"]);

	return addPassagesToNotes(
		db,
		await addTagsToNotes(db, userId, matchingNotes.map(toNoteDocument)),
	);
}

/** Counts the notes each library tab would show for the same search and filters. */
export async function countNoteViews(
	db: DbClient,
	userId: string,
	input: Omit<ListNotesInput, "sort" | "view">,
): Promise<Record<NoteView, number>> {
	const [counts] = await db
		.select({
			all: count(),
			drafts: count(sql`case when ${viewConditions.drafts} then 1 end`),
			linked: count(sql`case when ${isLinked} then 1 end`),
		})
		.from(notes)
		.where(and(...noteFilterConditions(db, userId, input)));

	return counts ?? { all: 0, drafts: 0, linked: 0 };
}

function noteFilterConditions(
	db: DbClient,
	userId: string,
	input: Omit<ListNotesInput, "sort" | "view">,
) {
	const conditions: SQL[] = [eq(notes.userId, userId)];

	if (input.bookIds?.length) {
		const noteIdsForBooks = db
			.select({ noteId: notePassages.noteId })
			.from(notePassages)
			.innerJoin(passages, eq(passages.id, notePassages.passageId))
			.where(inArray(passages.bookId, input.bookIds));
		conditions.push(inArray(notes.id, noteIdsForBooks));
	}
	if (input.collectionIds?.length) {
		const noteIdsForCollections = db
			.select({ noteId: collectionNotes.noteId })
			.from(collectionNotes)
			.innerJoin(collections, eq(collections.id, collectionNotes.collectionId))
			.where(
				and(
					inArray(collectionNotes.collectionId, input.collectionIds),
					eq(collections.userId, userId),
				),
			);
		conditions.push(inArray(notes.id, noteIdsForCollections));
	}
	if (input.passageId) {
		const noteIdsForPassage = db
			.select({ noteId: notePassages.noteId })
			.from(notePassages)
			.where(eq(notePassages.passageId, input.passageId));
		conditions.push(inArray(notes.id, noteIdsForPassage));
	}
	if (input.tagIds?.length) {
		const noteIdsForTags = db
			.select({ noteId: noteTagAssignments.noteId })
			.from(noteTagAssignments)
			.innerJoin(userNoteTags, eq(userNoteTags.id, noteTagAssignments.tagId))
			.where(
				and(
					inArray(noteTagAssignments.tagId, input.tagIds),
					eq(userNoteTags.userId, userId),
				),
			);
		conditions.push(inArray(notes.id, noteIdsForTags));
	}
	if (input.query) {
		const query = `%${escapeLikePattern(input.query)}%`;
		// Any linked passage counts, so "Romans" finds a note whose second
		// passage is in Romans.
		const noteIdsForPassageText = db
			.select({ noteId: notePassages.noteId })
			.from(notePassages)
			.innerJoin(passages, eq(passages.id, notePassages.passageId))
			.innerJoin(books, eq(books.id, passages.bookId))
			.where(or(ilike(books.name, query), ilike(passages.title, query)));
		const searchCondition = or(
			ilike(notes.title, query),
			ilike(notes.searchText, query),
			inArray(notes.id, noteIdsForPassageText),
		);
		if (searchCondition) conditions.push(searchCondition);
	}

	return conditions;
}

/** Returns Scripture books that have at least one note owned by the user. */
export async function listNoteBooks(db: DbClient, userId: string) {
	return db
		.selectDistinct({ id: books.id, name: books.name })
		.from(notes)
		.innerJoin(notePassages, eq(notePassages.noteId, notes.id))
		.innerJoin(passages, eq(passages.id, notePassages.passageId))
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
		.innerJoin(notePassages, eq(notePassages.noteId, notes.id))
		.where(
			and(eq(notes.userId, userId), eq(notePassages.passageId, passageId)),
		);

	return result?.count ?? 0;
}

/** Returns null when a note does not exist or belongs to a different user. */
export async function getNote(db: DbClient, userId: string, noteId: number) {
	const [note] = await db
		.select(noteSelection)
		.from(notes)
		.leftJoin(notePassages, mainPassageJoin)
		.leftJoin(passages, eq(passages.id, notePassages.passageId))
		.leftJoin(books, eq(books.id, passages.bookId))
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.limit(1);

	if (!note) return null;

	const [noteWithTags] = await addPassagesToNotes(
		db,
		await addTagsToNotes(db, userId, [toNoteDocument(note)]),
	);
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

/**
 * Creates or updates a note and replaces its tags and linked passages as one
 * atomic save. A saved note must have a title; drafts may be untitled.
 */
export async function saveNote(
	db: DbClient,
	userId: string,
	input: SaveNoteInput,
) {
	const passageIds = Array.from(new Set(input.passageIds));
	await assertPassagesExist(db, passageIds);

	const { id, passageIds: _passageIds, tags: inputTags, ...noteInput } = input;
	const storedNoteInput = {
		...noteInput,
		content: serializeRichTextDocument(noteInput.content),
		searchText: getDocumentText(noteInput.content),
		title: noteInput.title.trim(),
	};
	const tags = normalizeTags(inputTags);

	return db.transaction(async (tx) => {
		const [note] =
			id === undefined
				? await tx
						.insert(notes)
						.values({ ...storedNoteInput, userId })
						.returning()
				: await tx
						.update(notes)
						.set(storedNoteInput)
						.where(and(eq(notes.id, id), eq(notes.userId, userId)))
						.returning();

		if (!note) return null;

		await replaceNoteTags(tx, userId, note.id, tags);
		await replaceNotePassages(tx, note.id, passageIds);
		await recordNoteVersion(tx, note, {
			isNew: id === undefined,
			isManualSave: input.status === "saved",
		});
		const { searchText: _searchText, ...savedNote } = note;
		return toNoteDocument({ ...savedNote, passageId: passageIds[0] ?? null });
	});
}

/**
 * Pins or unpins a note without changing when it was last edited. Returns
 * false when the note doesn't exist or belongs to another user.
 */
export async function setNotePinned(
	db: DbClient,
	userId: string,
	noteId: number,
	pinned: boolean,
) {
	const [note] = await db
		.update(notes)
		.set({
			pinnedAt: pinned ? new Date() : null,
			updatedAt: sql`${notes.updatedAt}`,
		})
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.returning({ id: notes.id });

	return Boolean(note);
}

/** Returns a note's history, newest first; null when the note isn't the user's. */
export async function listNoteVersions(
	db: DbClient,
	userId: string,
	noteId: number,
) {
	const [note] = await db
		.select({ content: notes.content, title: notes.title })
		.from(notes)
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.limit(1);
	if (!note) return null;

	const versions = await db
		.select({
			content: noteVersions.content,
			createdAt: noteVersions.createdAt,
			id: noteVersions.id,
			summary: noteVersions.summary,
			title: noteVersions.title,
		})
		.from(noteVersions)
		.where(eq(noteVersions.noteId, noteId))
		.orderBy(desc(noteVersions.createdAt), desc(noteVersions.id));

	return versions.map(({ content, title, ...version }, index) => ({
		...version,
		// Only the newest version can be the current one: after a restore, an
		// older version may hold the same text but isn't where history stands.
		isCurrent: index === 0 && content === note.content && title === note.title,
	}));
}

/**
 * Puts an earlier version's title and body back. The note's state just
 * before the restore, and the restored state, are both kept as versions, so
 * no history is lost. Returns null when the note or version isn't found.
 */
export async function restoreNoteVersion(
	db: DbClient,
	userId: string,
	noteId: number,
	versionId: number,
) {
	const restored = await db.transaction(async (tx) => {
		const [note] = await tx
			.select()
			.from(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
			.limit(1);
		if (!note) return false;

		const [version] = await tx
			.select({ content: noteVersions.content, title: noteVersions.title })
			.from(noteVersions)
			.where(
				and(eq(noteVersions.id, versionId), eq(noteVersions.noteId, noteId)),
			)
			.limit(1);
		if (!version) return false;

		await recordNoteVersion(tx, note, {
			force: true,
			summary: "Before restoring an earlier version",
		});

		const content = parseStoredRichText(version.content);
		const [restoredNote] = await tx
			.update(notes)
			.set({
				content: version.content,
				searchText: getDocumentText(content),
				// A saved note must keep a title, so an untitled early draft
				// restores its body only.
				title:
					version.title || note.status === "draft" ? version.title : note.title,
			})
			.where(eq(notes.id, noteId))
			.returning();
		if (!restoredNote) return false;

		await recordNoteVersion(tx, restoredNote, {
			force: true,
			summary: "Restored an earlier version",
		});
		return true;
	});

	return restored ? getNote(db, userId, noteId) : null;
}

/**
 * Writes the note's current title and body as a version when something
 * changed and either enough time has passed, a section was added, or the
 * member saved on purpose.
 */
async function recordNoteVersion(
	tx: Transaction,
	note: { content: string; id: number; title: string },
	options: {
		force?: boolean;
		isManualSave?: boolean;
		isNew?: boolean;
		summary?: string;
	},
) {
	const [latest] = await tx
		.select({
			content: noteVersions.content,
			createdAt: noteVersions.createdAt,
			title: noteVersions.title,
		})
		.from(noteVersions)
		.where(eq(noteVersions.noteId, note.id))
		.orderBy(desc(noteVersions.createdAt), desc(noteVersions.id))
		.limit(1);

	if (latest?.content === note.content && latest.title === note.title) return;

	const addedSections = latest
		? findAddedSections(latest.content, note.content)
		: [];
	const isDue =
		!latest ||
		Date.now() - latest.createdAt.getTime() >= VERSION_INTERVAL_MS ||
		addedSections.length > 0 ||
		options.force ||
		options.isManualSave;
	if (!isDue) return;

	await tx.insert(noteVersions).values({
		content: note.content,
		noteId: note.id,
		summary:
			options.summary ??
			(options.isNew
				? "Note created"
				: addedSections.length
					? `Added ${addedSections.join(", ")}`
					: options.isManualSave
						? "Saved"
						: null),
		title: note.title,
	});
}

/** Section headings in the new body whose names weren't in the old one. */
function findAddedSections(previousContent: string, nextContent: string) {
	const sectionNames = (content: string) =>
		getDocumentSections(parseStoredRichText(content))
			.map((section) => section.text.trim())
			.filter(Boolean);
	const previous = new Set(sectionNames(previousContent));
	return sectionNames(nextContent).filter((name) => !previous.has(name));
}

function toNoteDocument<Note extends { content: string }>(
	note: Note,
): Omit<Note, "content"> & { content: RichTextDocument } {
	return { ...note, content: parseStoredRichText(note.content) };
}

/** Returns false when a note does not exist or belongs to a different user. */
export async function deleteNote(db: DbClient, userId: string, noteId: number) {
	const [deletedNote] = await db
		.delete(notes)
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.returning({ id: notes.id });

	return Boolean(deletedNote);
}

async function assertPassagesExist(db: DbClient, passageIds: number[]) {
	if (passageIds.length === 0) return;
	const found = await db
		.select({ id: passages.id })
		.from(passages)
		.where(inArray(passages.id, passageIds));

	if (found.length !== passageIds.length) throw new Error("Passage not found.");
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

/** Adds every linked passage, in the member's order, to each note. */
async function addPassagesToNotes<Note extends { id: number }>(
	db: DbClient,
	notesToEnrich: Note[],
): Promise<Array<Note & { passages: NotePassage[] }>> {
	if (notesToEnrich.length === 0) return [];

	const rows = await db
		.select({
			bookName: books.name,
			id: passages.id,
			noteId: notePassages.noteId,
			title: passages.title,
		})
		.from(notePassages)
		.innerJoin(passages, eq(passages.id, notePassages.passageId))
		.innerJoin(books, eq(books.id, passages.bookId))
		.where(
			inArray(
				notePassages.noteId,
				notesToEnrich.map((note) => note.id),
			),
		)
		.orderBy(asc(notePassages.position));
	const passagesByNoteId = new Map<number, NotePassage[]>();
	for (const row of rows) {
		const notePassageList = passagesByNoteId.get(row.noteId) ?? [];
		notePassageList.push({ id: row.id, label: row.title ?? row.bookName });
		passagesByNoteId.set(row.noteId, notePassageList);
	}

	return notesToEnrich.map((note) => ({
		...note,
		passages: passagesByNoteId.get(note.id) ?? [],
	}));
}

async function replaceNotePassages(
	tx: Transaction,
	noteId: number,
	passageIds: number[],
) {
	await tx.delete(notePassages).where(eq(notePassages.noteId, noteId));
	if (passageIds.length === 0) return;
	await tx.insert(notePassages).values(
		passageIds.map((passageId, position) => ({
			noteId,
			passageId,
			position,
		})),
	);
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
	tx: Transaction,
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
