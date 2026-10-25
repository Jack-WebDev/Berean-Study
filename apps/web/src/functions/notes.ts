import { db } from "@berean-study/db";
import {
	addTagToNote as addTagToNoteInDb,
	countNotesForPassage as countNotesForPassageInDb,
	countNoteViews as countNoteViewsInDb,
	deleteNote as deleteNoteInDb,
	getNote as getNoteFromDb,
	listNoteBooks as listNoteBooksFromDb,
	listNotes as listNotesFromDb,
	listNoteTags as listNoteTagsFromDb,
	listNoteVersions as listNoteVersionsFromDb,
	notePurposes,
	removeTagFromNote as removeTagFromNoteInDb,
	restoreNoteVersion as restoreNoteVersionInDb,
	saveNote as saveNoteInDb,
	setNotePinned as setNotePinnedInDb,
	setNoteTags as setNoteTagsInDb,
} from "@berean-study/db/notes";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";
import { richTextDocumentSchema } from "./rich-text";

const noteIdSchema = z.object({
	id: z.number().int().positive(),
});

/** Autosaved drafts may be untitled; saving a note out of draft needs a title. */
const saveNoteSchema = z
	.object({
		content: richTextDocumentSchema,
		id: z.number().int().positive().optional(),
		passageIds: z.array(z.number().int().positive()).max(20),
		purpose: z.enum(notePurposes).nullable().optional(),
		status: z.enum(["draft", "saved"]).optional(),
		tags: z.array(z.string().trim().min(1).max(50)).max(20),
		title: z.string().trim().max(200),
	})
	.refine((note) => note.status !== "saved" || note.title.length > 0, {
		message: "Enter a title before saving your note.",
		path: ["title"],
	});

const filterIdsSchema = z.array(z.number().int().positive()).max(50).optional();

const noteFiltersSchema = z.object({
	bookIds: filterIdsSchema,
	collectionIds: filterIdsSchema,
	passageId: z.number().int().positive().optional(),
	query: z.string().trim().max(200).optional(),
	tagIds: filterIdsSchema,
});

const listNotesSchema = noteFiltersSchema.extend({
	sort: z.enum(["created", "title", "updated"]).optional(),
	view: z.enum(["all", "drafts", "linked"]).optional(),
});

const noteVersionSchema = noteIdSchema.extend({
	versionId: z.number().int().positive(),
});

const noteTagSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().trim().min(1).max(50),
});

const removeNoteTagSchema = noteIdSchema.extend({
	tagId: z.number().int().positive(),
});

const setNoteTagsSchema = noteIdSchema.extend({
	tags: z.array(z.string().trim().min(1).max(50)).max(20),
});

function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const listNotes = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(listNotesSchema)
	.handler(({ context, data }) =>
		listNotesFromDb(db, requireUserId(context.session), data),
	);

export const countNoteViews = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(noteFiltersSchema)
	.handler(({ context, data }) =>
		countNoteViewsInDb(db, requireUserId(context.session), data),
	);

export const listNoteBooks = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listNoteBooksFromDb(db, requireUserId(context.session)),
	);

export const listNoteTags = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listNoteTagsFromDb(db, requireUserId(context.session)),
	);

export const countNotesForPassage = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ passageId: z.number().int().positive() }))
	.handler(({ context, data }) =>
		countNotesForPassageInDb(
			db,
			requireUserId(context.session),
			data.passageId,
		),
	);

export const getNote = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		getNoteFromDb(db, requireUserId(context.session), data.id),
	);

export const saveNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(saveNoteSchema)
	.handler(({ context, data }) =>
		saveNoteInDb(db, requireUserId(context.session), data),
	);

export const deleteNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		deleteNoteInDb(db, requireUserId(context.session), data.id),
	);

export const setNotePinned = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(noteIdSchema.extend({ pinned: z.boolean() }))
	.handler(({ context, data }) =>
		setNotePinnedInDb(db, requireUserId(context.session), data.id, data.pinned),
	);

export const listNoteVersions = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		listNoteVersionsFromDb(db, requireUserId(context.session), data.id),
	);

export const restoreNoteVersion = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(noteVersionSchema)
	.handler(({ context, data }) =>
		restoreNoteVersionInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.versionId,
		),
	);

export const addTagToNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(noteTagSchema)
	.handler(({ context, data }) =>
		addTagToNoteInDb(db, requireUserId(context.session), data.id, data.name),
	);

export const removeTagFromNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(removeNoteTagSchema)
	.handler(({ context, data }) =>
		removeTagFromNoteInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.tagId,
		),
	);

export const setNoteTags = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(setNoteTagsSchema)
	.handler(({ context, data }) =>
		setNoteTagsInDb(db, requireUserId(context.session), data.id, {
			tags: data.tags,
		}),
	);
