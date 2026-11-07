import { db } from "@berean-study/db";
import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { listSources } from "@berean-study/db/evidence";
import { themePassageRoles } from "@berean-study/db/interpretation-body";
import {
	addPassageToTheme as addPassageToThemeInDb,
	getConnectionRecord as getConnectionRecordFromDb,
	getPassageConnections as getPassageConnectionsFromDb,
	getPassageLanguage as getPassageLanguageFromDb,
	getStudyRecord as getStudyRecordFromDb,
	getThemeEditor as getThemeEditorFromDb,
	listFoundationalConfirmations as listFoundationalConfirmationsFromDb,
	listStudyRecords as listStudyRecordsFromDb,
	listThemes as listThemesFromDb,
	previewPassage as previewPassageFromDb,
	proposeThemeMerge as proposeThemeMergeInDb,
	requestPublicationConfirmation as requestPublicationConfirmationInDb,
	resolveConnection as resolveConnectionInDb,
	saveStudyDraft as saveStudyDraftInDb,
	studyKinds,
} from "@berean-study/db/study-content";
import { decideChange } from "@berean-study/db/two-person";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

// The engine checks the exact permission each kind needs. These only keep everyone
// else out of the screens and the unpublished wording behind them.
const writers = [
	"content.write",
	"content.revise",
	"content.original_language",
] as const satisfies readonly PermissionKey[];

const kindSchema = z.enum(studyKinds);
const connectionKindSchema = z.enum([
	"cross_reference",
	"canonical_relationship",
]);
const scopeKeySchema = z.string().trim().min(1).max(200);
const passageSchema = z.string().trim().min(1).max(100);
const searchSchema = z.string().trim().max(200).optional();
const idSchema = z.number().int().positive();
const reasonSchema = z.string().trim().min(1).max(2000);

export const getStudyRecord = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ kind: kindSchema, scopeKey: scopeKeySchema }))
	.handler(({ context, data }) =>
		getStudyRecordFromDb(db, data, context.userId),
	);

export const listStudyRecords = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(
		z.object({ kinds: z.array(kindSchema).min(1), search: searchSchema }),
	)
	.handler(({ data }) => listStudyRecordsFromDb(db, data));

export const saveStudyDraft = createServerFn({ method: "POST" })
	.middleware([requirePermission(...writers)])
	// The body is big and nested, so its shape is checked where it's saved.
	.validator(
		z.object({
			body: z.unknown(),
			kind: kindSchema,
			scopeKey: scopeKeySchema.nullable(),
		}),
	)
	.handler(({ context, data }) =>
		saveStudyDraftInDb(db, { ...data, actorUserId: context.userId }),
	);

export const previewPassage = createServerFn({ method: "POST" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ text: passageSchema }))
	.handler(({ data }) => previewPassageFromDb(db, data.text));

export const getPassageConnections = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ passage: passageSchema }))
	.handler(({ data }) => getPassageConnectionsFromDb(db, data.passage));

export const getPassageLanguage = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ passage: passageSchema }))
	.handler(({ data }) => getPassageLanguageFromDb(db, data.passage));

export const getConnectionRecord = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ kind: connectionKindSchema, scopeKey: scopeKeySchema }))
	.handler(({ context, data }) =>
		getConnectionRecordFromDb(db, data, context.userId),
	);

export const resolveConnection = createServerFn({ method: "POST" })
	.middleware([requirePermission(...writers)])
	.validator(
		z.object({
			first: passageSchema,
			kind: connectionKindSchema,
			second: passageSchema,
		}),
	)
	.handler(({ data }) => resolveConnectionInDb(db, data));

export const listThemes = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ search: searchSchema }))
	.handler(({ data }) => listThemesFromDb(db, data));

export const getThemeEditor = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ themeId: idSchema.nullable() }))
	.handler(({ context, data }) =>
		getThemeEditorFromDb(db, data, context.userId),
	);

export const addPassageToTheme = createServerFn({ method: "POST" })
	.middleware([requirePermission(...writers)])
	.validator(
		z.object({
			key: z.string().min(1).max(64),
			passage: passageSchema,
			role: z.enum(themePassageRoles),
			themeId: idSchema,
			why: z.string().trim().max(500),
		}),
	)
	.handler(({ context, data }) =>
		addPassageToThemeInDb(db, { ...data, actorUserId: context.userId }),
	);

export const listNameableSources = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ search: searchSchema }))
	.handler(({ data }) => listSources(db, data));

export const requestPublicationConfirmation = createServerFn({ method: "POST" })
	.middleware([requirePermission("content.confirm_foundational")])
	.validator(
		z.object({
			contentItemId: idSchema,
			reason: reasonSchema,
			revisionId: idSchema,
		}),
	)
	.handler(({ context, data }) =>
		requestPublicationConfirmationInDb(db, {
			...data,
			actorUserId: context.userId,
		}),
	);

export const proposeThemeMerge = createServerFn({ method: "POST" })
	.middleware([requirePermission("content.confirm_foundational")])
	.validator(
		z.object({
			intoThemeId: idSchema,
			reason: reasonSchema,
			themeId: idSchema,
		}),
	)
	.handler(({ context, data }) =>
		proposeThemeMergeInDb(db, { ...data, actorUserId: context.userId }),
	);

export const decideFoundationalChange = createServerFn({ method: "POST" })
	.middleware([requirePermission("content.confirm_foundational")])
	.validator(
		z.object({
			decision: z.enum(["confirm", "return", "reject"]),
			note: reasonSchema,
			proposalId: idSchema,
		}),
	)
	.handler(({ context, data }) =>
		decideChange(db, { ...data, deciderUserId: context.userId }),
	);

export const listFoundationalConfirmations = createServerFn({ method: "GET" })
	.middleware([requirePermission("content.confirm_foundational")])
	.handler(({ context }) =>
		listFoundationalConfirmationsFromDb(db, context.userId),
	);
