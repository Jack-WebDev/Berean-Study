import { db } from "@berean-study/db";
import {
	addPassageToCollection as addPassageToCollectionInDb,
	arrangeCollectionPassages as arrangeCollectionPassagesInDb,
	createCollection as createCollectionInDb,
	createCollectionSection as createCollectionSectionInDb,
	deleteCollection as deleteCollectionInDb,
	deleteCollectionSection as deleteCollectionSectionInDb,
	getCollectionDetail as getCollectionDetailFromDb,
	getCollectionLibrary as getCollectionLibraryFromDb,
	listCollectionsForNote as listCollectionsForNoteFromDb,
	listCollectionsForNotes as listCollectionsForNotesFromDb,
	listCollectionsForPassage as listCollectionsForPassageFromDb,
	markCollectionOpened as markCollectionOpenedInDb,
	moveCollectionSection as moveCollectionSectionInDb,
	removeNoteFromCollection as removeNoteFromCollectionInDb,
	removePassageFromCollection as removePassageFromCollectionInDb,
	renameCollectionSection as renameCollectionSectionInDb,
	setCollectionPassageRead as setCollectionPassageReadInDb,
	setCollectionPinned as setCollectionPinnedInDb,
	setCollectionsForNote as setCollectionsForNoteInDb,
	setCollectionsForPassage as setCollectionsForPassageInDb,
	updateCollection as updateCollectionInDb,
} from "@berean-study/db/collections";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

const idSchema = z.number().int().positive();

const collectionInputSchema = z.object({
	color: z
		.string()
		.regex(/^#[0-9a-f]{6}$/i)
		.transform((color) => color.toLowerCase()),
	description: z.string().trim().max(280),
	name: z.string().trim().min(1).max(100),
	tags: z.array(z.string().trim().min(1).max(50)).max(20),
	type: z.enum(["list", "project", "teaching"]),
	visibility: z.enum(["private", "shared", "public"]),
});

const sectionTitleSchema = z.string().trim().min(1).max(100);

function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

/** Every collection's card, plus the study project to continue. */
export const getCollectionLibrary = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getCollectionLibraryFromDb(db, requireUserId(context.session)),
	);

export const listCollectionsForNotes = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listCollectionsForNotesFromDb(db, requireUserId(context.session)),
	);

export const getCollectionDetail = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ id: idSchema }))
	.handler(({ context, data }) =>
		getCollectionDetailFromDb(db, requireUserId(context.session), data.id),
	);

export const createCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(collectionInputSchema)
	.handler(({ context, data }) =>
		createCollectionInDb(db, requireUserId(context.session), data),
	);

export const updateCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(collectionInputSchema.extend({ id: idSchema }))
	.handler(({ context, data }) => {
		const { id, ...input } = data;
		return updateCollectionInDb(db, requireUserId(context.session), id, input);
	});

export const deleteCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: idSchema }))
	.handler(({ context, data }) =>
		deleteCollectionInDb(db, requireUserId(context.session), data.id),
	);

export const setCollectionPinned = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: idSchema, pinned: z.boolean() }))
	.handler(({ context, data }) =>
		setCollectionPinnedInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.pinned,
		),
	);

export const markCollectionOpened = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: idSchema }))
	.handler(({ context, data }) =>
		markCollectionOpenedInDb(db, requireUserId(context.session), data.id),
	);

export const addPassageToCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			id: idSchema,
			passageId: idSchema,
			sectionId: idSchema.nullable(),
		}),
	)
	.handler(({ context, data }) =>
		addPassageToCollectionInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.passageId,
			data.sectionId,
		),
	);

export const removePassageFromCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: idSchema, passageId: idSchema }))
	.handler(({ context, data }) =>
		removePassageFromCollectionInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.passageId,
		),
	);

export const arrangeCollectionPassages = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			groups: z
				.array(
					z.object({
						passageIds: z.array(idSchema).max(500),
						sectionId: idSchema.nullable(),
					}),
				)
				.max(100),
			id: idSchema,
		}),
	)
	.handler(({ context, data }) =>
		arrangeCollectionPassagesInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.groups,
		),
	);

export const setCollectionPassageRead = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: idSchema, passageId: idSchema, read: z.boolean() }))
	.handler(({ context, data }) =>
		setCollectionPassageReadInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.passageId,
			data.read,
		),
	);

export const createCollectionSection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: idSchema, title: sectionTitleSchema }))
	.handler(({ context, data }) =>
		createCollectionSectionInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.title,
		),
	);

export const renameCollectionSection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({ id: idSchema, sectionId: idSchema, title: sectionTitleSchema }),
	)
	.handler(({ context, data }) =>
		renameCollectionSectionInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.sectionId,
			data.title,
		),
	);

export const moveCollectionSection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			id: idSchema,
			sectionId: idSchema,
			toIndex: z.number().int().min(0),
		}),
	)
	.handler(({ context, data }) =>
		moveCollectionSectionInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.sectionId,
			data.toIndex,
		),
	);

export const deleteCollectionSection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: idSchema, sectionId: idSchema }))
	.handler(({ context, data }) =>
		deleteCollectionSectionInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.sectionId,
		),
	);

const noteIdSchema = z.object({ id: idSchema });

export const listCollectionsForNote = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(noteIdSchema)
	.handler(({ context, data }) =>
		listCollectionsForNoteFromDb(db, requireUserId(context.session), data.id),
	);

export const setCollectionsForNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		noteIdSchema.extend({
			collectionIds: z.array(idSchema).max(100),
		}),
	)
	.handler(({ context, data }) =>
		setCollectionsForNoteInDb(
			db,
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
			db,
			requireUserId(context.session),
			data.id,
		),
	);

export const setCollectionsForPassage = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		noteIdSchema.extend({
			collectionIds: z.array(idSchema).max(100),
		}),
	)
	.handler(({ context, data }) =>
		setCollectionsForPassageInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.collectionIds,
		),
	);

export const removeNoteFromCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(noteIdSchema.extend({ noteId: idSchema }))
	.handler(({ context, data }) =>
		removeNoteFromCollectionInDb(
			db,
			requireUserId(context.session),
			data.id,
			data.noteId,
		),
	);
