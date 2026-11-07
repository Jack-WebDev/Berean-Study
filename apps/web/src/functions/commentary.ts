import { db } from "@berean-study/db";
import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	getCommentaryEditor as getCommentaryEditorFromDb,
	listCommentaries as listCommentariesFromDb,
	resolveCommentaryScope as resolveCommentaryScopeInDb,
	resolveEditorReference as resolveEditorReferenceInDb,
} from "@berean-study/db/commentary";
import { commentaryKinds } from "@berean-study/db/commentary-body";
import { saveDraft } from "@berean-study/db/content-workflow";
import { listExcerpts } from "@berean-study/db/evidence";
import { listResearchNotes } from "@berean-study/db/research-notes";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const writers = [
	"content.write",
	"content.revise",
] as const satisfies readonly PermissionKey[];

const kindSchema = z.enum(commentaryKinds);
const scopeSchema = z.object({
	kind: kindSchema,
	scopeKey: z.string().trim().min(1).max(100),
});

export const getCommentaryEditor = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(scopeSchema)
	.handler(({ context, data }) =>
		getCommentaryEditorFromDb(db, data, context.userId),
	);

export const listCommentaries = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ search: z.string().trim().max(200).optional() }))
	.handler(({ data }) => listCommentariesFromDb(db, data));

export const resolveCommentaryScope = createServerFn({ method: "POST" })
	.middleware([requirePermission(...writers)])
	.validator(
		z.object({
			from: z.string().trim().max(100).optional(),
			kind: kindSchema,
			to: z.string().trim().max(100).optional(),
		}),
	)
	.handler(({ data }) => resolveCommentaryScopeInDb(db, data));

export const resolveEditorReference = createServerFn({ method: "POST" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ text: z.string().trim().min(1).max(100) }))
	.handler(({ data }) => resolveEditorReferenceInDb(db, data.text));

export const saveCommentaryDraft = createServerFn({ method: "POST" })
	.middleware([requirePermission(...writers)])
	// The body is big and nested, so its shape is checked where it's saved.
	.validator(scopeSchema.extend({ body: z.unknown() }))
	.handler(({ context, data }) =>
		saveDraft(db, { ...data, actorUserId: context.userId }),
	);

export const listCitableExcerpts = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ search: z.string().trim().max(200).optional() }))
	.handler(({ data }) => listExcerpts(db, { ...data, usableOnly: true }));

export const listResearchForBook = createServerFn({ method: "GET" })
	.middleware([requirePermission(...writers)])
	.validator(z.object({ bookSlug: z.string().trim().min(1).max(100) }))
	.handler(({ data }) => listResearchNotes(db, data));
