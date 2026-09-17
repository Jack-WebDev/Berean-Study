import { createDb } from "@berean-study/db";
import {
	addTagToNote as addTagToNoteInDb,
	countNotesForPassage as countNotesForPassageInDb,
	createNoteCollection as createNoteCollectionInDb,
	createNote as createNoteInDb,
	deleteNote as deleteNoteInDb,
	getNote as getNoteFromDb,
	listNoteBooks as listNoteBooksFromDb,
	listNoteCollections as listNoteCollectionsFromDb,
	listNotes as listNotesFromDb,
	listNoteTags as listNoteTagsFromDb,
	removeTagFromNote as removeTagFromNoteInDb,
	setNoteCollection as setNoteCollectionInDb,
	setNoteTags as setNoteTagsInDb,
	updateNote as updateNoteInDb,
} from "@berean-study/db/notes";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

const noteIdSchema = z.object({
	id: z.number().int().positive(),
});

const noteInputSchema = z.object({
	content: z.string().trim().min(1),
	passageId: z.number().int().positive().nullable().optional(),
});

const updateNoteSchema = noteIdSchema.extend(noteInputSchema.shape);

const listNotesSchema = z.object({
	bookId: z.number().int().positive().optional(),
	collectionId: z.number().int().positive().optional(),
	passageId: z.number().int().positive().optional(),
	query: z.string().trim().max(200).optional(),
	sort: z.literal("updated-desc").default("updated-desc"),
	tagId: z.number().int().positive().optional(),
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

const collectionNameSchema = z.object({
	name: z.string().trim().min(1).max(100),
});

const setNoteCollectionSchema = noteIdSchema.extend({
	collectionId: z.number().int().positive().nullable(),
});

function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const listNotes = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(listNotesSchema)
	.handler(({ context, data }) =>
		listNotesFromDb(createDb(), requireUserId(context.session), data),
	);

export const listNoteBooks = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listNoteBooksFromDb(createDb(), requireUserId(context.session)),
	);

export const listNoteTags = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listNoteTagsFromDb(createDb(), requireUserId(context.session)),
	);

export const listNoteCollections = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listNoteCollectionsFromDb(createDb(), requireUserId(context.session)),
	);

export const countNotesForPassage = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ passageId: z.number().int().positive() }))
	.handler(({ context, data }) =>
		countNotesForPassageInDb(
			createDb(),
			requireUserId(context.session),
			data.passageId,
		),
	);

export const getNote = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		getNoteFromDb(createDb(), requireUserId(context.session), data.id),
	);

export const createNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(noteInputSchema)
	.handler(({ context, data }) =>
		createNoteInDb(createDb(), requireUserId(context.session), data),
	);

export const updateNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(updateNoteSchema)
	.handler(({ context, data }) => {
		const { id, ...input } = data;
		return updateNoteInDb(
			createDb(),
			requireUserId(context.session),
			id,
			input,
		);
	});

export const deleteNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		deleteNoteInDb(createDb(), requireUserId(context.session), data.id),
	);

export const addTagToNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(noteTagSchema)
	.handler(({ context, data }) =>
		addTagToNoteInDb(
			createDb(),
			requireUserId(context.session),
			data.id,
			data.name,
		),
	);

export const removeTagFromNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(removeNoteTagSchema)
	.handler(({ context, data }) =>
		removeTagFromNoteInDb(
			createDb(),
			requireUserId(context.session),
			data.id,
			data.tagId,
		),
	);

export const setNoteTags = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(setNoteTagsSchema)
	.handler(({ context, data }) =>
		setNoteTagsInDb(createDb(), requireUserId(context.session), data.id, {
			tags: data.tags,
		}),
	);

export const createNoteCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(collectionNameSchema)
	.handler(({ context, data }) =>
		createNoteCollectionInDb(
			createDb(),
			requireUserId(context.session),
			data.name,
		),
	);

export const setNoteCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(setNoteCollectionSchema)
	.handler(({ context, data }) =>
		setNoteCollectionInDb(
			createDb(),
			requireUserId(context.session),
			data.id,
			data.collectionId,
		),
	);
