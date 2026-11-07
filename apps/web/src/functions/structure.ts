import { db } from "@berean-study/db";
import { versePresenceKinds } from "@berean-study/db/scripture-catalogue";
import {
	getStructureChange as getStructureChangeFromDb,
	getVerseHandling as getVerseHandlingFromDb,
	listStructureChanges as listStructureChangesFromDb,
	proposeVerseAddition as proposeVerseAdditionInDb,
	proposeVerseHandling as proposeVerseHandlingInDb,
} from "@berean-study/db/structure-admin";
import { decideChange } from "@berean-study/db/two-person";
import { HIGHEST_VERSE_NUMBER } from "@berean-study/db/verse-text-tools";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const slugSchema = z.string().trim().min(1).max(100);
const chapterSchema = z.number().int().positive().max(200);
const verseSchema = z.number().int().positive().max(HIGHEST_VERSE_NUMBER);
const reasonSchema = z.string().trim().min(1).max(1000);
const handlingSchema = z
	.array(
		z.object({
			abbreviation: z.string().trim().min(1).max(10),
			kind: z.enum(["own", ...versePresenceKinds]),
			includedInVerse: verseSchema.nullish(),
		}),
	)
	.max(6);

export const listStructureChanges = createServerFn({ method: "GET" })
	.middleware([requirePermission("canon.manage", "scripture.manage")])
	.handler(({ context }) => listStructureChangesFromDb(db, context.userId));

export const getStructureChange = createServerFn({ method: "GET" })
	.middleware([requirePermission("scripture.manage")])
	.validator(z.object({ id: z.number().int().positive() }))
	.handler(({ context, data }) =>
		getStructureChangeFromDb(db, data.id, context.userId),
	);

export const getVerseHandling = createServerFn({ method: "GET" })
	.middleware([requirePermission("scripture.manage")])
	.validator(
		z.object({
			chapter: chapterSchema,
			slug: slugSchema,
			verse: verseSchema,
		}),
	)
	.handler(({ data }) => getVerseHandlingFromDb(db, data));

export const proposeVerseAddition = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.manage")])
	.validator(
		z.object({
			chapter: chapterSchema,
			handling: handlingSchema,
			lastVerse: verseSchema,
			reason: reasonSchema,
			slug: slugSchema,
		}),
	)
	.handler(({ context, data }) =>
		proposeVerseAdditionInDb(db, { ...data, actorUserId: context.userId }),
	);

export const proposeVerseHandling = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.manage")])
	.validator(
		z.object({
			chapter: chapterSchema,
			handling: handlingSchema,
			reason: reasonSchema,
			slug: slugSchema,
			verse: verseSchema,
		}),
	)
	.handler(({ context, data }) =>
		proposeVerseHandlingInDb(db, { ...data, actorUserId: context.userId }),
	);

export const decideFoundationChange = createServerFn({ method: "POST" })
	// Each kind of change also checks its own permission when it's decided.
	.middleware([requirePermission("canon.manage", "scripture.manage")])
	.validator(
		z.object({
			decision: z.enum(["confirm", "return", "reject"]),
			note: reasonSchema,
			proposalId: z.number().int().positive(),
		}),
	)
	.handler(({ context, data }) =>
		decideChange(db, { ...data, deciderUserId: context.userId }),
	);
