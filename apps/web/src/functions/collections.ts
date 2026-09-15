import { createDb } from "@berean-study/db";
import {
	createCollection as createCollectionInDb,
	deleteCollection as deleteCollectionInDb,
	getCollection as getCollectionFromDb,
	listCollectionNotes as listCollectionNotesFromDb,
	listCollectionPassages as listCollectionPassagesFromDb,
	listCollectionsForNote as listCollectionsForNoteFromDb,
	listCollectionsForPassage as listCollectionsForPassageFromDb,
	listCollections as listCollectionsFromDb,
	removeNoteFromCollection as removeNoteFromCollectionInDb,
	setCollectionsForNote as setCollectionsForNoteInDb,
	setCollectionsForPassage as setCollectionsForPassageInDb,
	updateCollection as updateCollectionInDb,
} from "@berean-study/db/collections";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

const collectionContentTypeSchema = z.enum([
	"passages",
	"notes",
	"highlights",
	"study-themes",
]);

const collectionInputSchema = z.object({
	allowedContent: z.array(collectionContentTypeSchema).max(4),
	coverId: z.enum(["mountains", "lake", "open-bible", "coastline"]),
	description: z.string().trim().max(280),
	name: z.string().trim().min(1).max(100),
	tags: z.array(z.string().trim().min(1).max(50)).max(20),
});

function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const listCollections = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listCollectionsFromDb(createDb(), requireUserId(context.session)),
	);

export const getCollection = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ id: z.number().int().positive() }))
	.handler(({ context, data }) =>
		getCollectionFromDb(createDb(), requireUserId(context.session), data.id),
	);

export const createCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(collectionInputSchema)
	.handler(({ context, data }) =>
		createCollectionInDb(createDb(), requireUserId(context.session), data),
	);

export const updateCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(collectionInputSchema.extend({ id: z.number().int().positive() }))
	.handler(({ context, data }) => {
		const { id, ...input } = data;
		return updateCollectionInDb(
			createDb(),
			requireUserId(context.session),
			id,
			input,
		);
	});

export const deleteCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: z.number().int().positive() }))
	.handler(({ context, data }) =>
		deleteCollectionInDb(createDb(), requireUserId(context.session), data.id),
	);

const noteIdSchema = z.object({ id: z.number().int().positive() });

export const listCollectionsForNote = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		listCollectionsForNoteFromDb(
			createDb(),
			requireUserId(context.session),
			data.id,
		),
	);

export const setCollectionsForNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		noteIdSchema.extend({
			collectionIds: z.array(z.number().int().positive()).max(100),
		}),
	)
	.handler(({ context, data }) =>
		setCollectionsForNoteInDb(
			createDb(),
			requireUserId(context.session),
			data.id,
			data.collectionIds,
		),
	);

export const listCollectionsForPassage = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		listCollectionsForPassageFromDb(
			createDb(),
			requireUserId(context.session),
			data.id,
		),
	);

export const setCollectionsForPassage = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		noteIdSchema.extend({
			collectionIds: z.array(z.number().int().positive()).max(100),
		}),
	)
	.handler(({ context, data }) =>
		setCollectionsForPassageInDb(
			createDb(),
			requireUserId(context.session),
			data.id,
			data.collectionIds,
		),
	);

export const listCollectionNotes = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		listCollectionNotesFromDb(
			createDb(),
			requireUserId(context.session),
			data.id,
		),
	);

export const listCollectionPassages = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		listCollectionPassagesFromDb(
			createDb(),
			requireUserId(context.session),
			data.id,
		),
	);

export const removeNoteFromCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(noteIdSchema.extend({ noteId: z.number().int().positive() }))
	.handler(({ context, data }) =>
		removeNoteFromCollectionInDb(
			createDb(),
			requireUserId(context.session),
			data.id,
			data.noteId,
		),
	);
