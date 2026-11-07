import { db } from "@berean-study/db";
import {
	findSimilarSources as findSimilarSourcesInDb,
	getEvidenceWorkbench as getEvidenceWorkbenchFromDb,
	listClaims,
	listSources,
	mergeSources as mergeSourcesInDb,
	retireSource as retireSourceInDb,
	saveEvidenceDraft as saveEvidenceDraftInDb,
} from "@berean-study/db/evidence";
import {
	claimBodySchema,
	excerptBodySchema,
	sourceBodySchema,
} from "@berean-study/db/evidence-body";
import {
	deleteResearchNote as deleteResearchNoteInDb,
	listResearchNotes as listResearchNotesFromDb,
	saveResearchNote as saveResearchNoteInDb,
} from "@berean-study/db/research-notes";
import { decideChange } from "@berean-study/db/two-person";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const idSchema = z.number().int().positive();
const searchSchema = z.string().trim().max(200).optional();
const reasonSchema = z.string().trim().min(1).max(1000);

export const listEvidenceSources = createServerFn({ method: "GET" })
	// Research notes pick from these too.
	.middleware([requirePermission("sources.manage", "research.manage")])
	.validator(
		z.object({
			includeInactive: z.boolean().optional(),
			search: searchSchema,
		}),
	)
	.handler(({ data }) => listSources(db, data));

export const listEvidenceClaims = createServerFn({ method: "GET" })
	.middleware([requirePermission("sources.manage")])
	.validator(z.object({ search: searchSchema }))
	.handler(({ data }) => listClaims(db, data));

export const getEvidenceWorkbench = createServerFn({ method: "GET" })
	.middleware([requirePermission("sources.manage")])
	.validator(
		z.object({
			claimId: idSchema.optional(),
			excerptId: idSchema.optional(),
			sourceId: idSchema.optional(),
		}),
	)
	.handler(({ context, data }) =>
		getEvidenceWorkbenchFromDb(db, data, context.userId),
	);

export const findSimilarSources = createServerFn({ method: "GET" })
	.middleware([requirePermission("sources.manage")])
	.validator(
		z.object({
			exceptSourceId: idSchema.optional(),
			title: z.string().trim().max(300),
		}),
	)
	.handler(({ data }) => findSimilarSourcesInDb(db, data));

export const saveEvidenceDraft = createServerFn({ method: "POST" })
	.middleware([requirePermission("sources.manage")])
	.validator(
		z.discriminatedUnion("kind", [
			z.object({
				body: sourceBodySchema,
				id: idSchema.optional(),
				kind: z.literal("source"),
			}),
			z.object({
				body: excerptBodySchema,
				id: idSchema.optional(),
				kind: z.literal("source_excerpt"),
				sourceId: idSchema.optional(),
			}),
			z.object({
				body: claimBodySchema,
				id: idSchema.optional(),
				kind: z.literal("claim"),
			}),
		]),
	)
	.handler(({ context, data }) =>
		saveEvidenceDraftInDb(db, { ...data, actorUserId: context.userId }),
	);

export const mergeSources = createServerFn({ method: "POST" })
	.middleware([requirePermission("sources.merge")])
	.validator(
		z.object({
			keepSourceId: idSchema,
			mergeSourceId: idSchema,
			reason: reasonSchema,
		}),
	)
	.handler(({ context, data }) =>
		mergeSourcesInDb(db, { ...data, actorUserId: context.userId }),
	);

export const retireSource = createServerFn({ method: "POST" })
	.middleware([requirePermission("sources.retire")])
	.validator(z.object({ reason: reasonSchema, sourceId: idSchema }))
	.handler(({ context, data }) =>
		retireSourceInDb(db, { ...data, actorUserId: context.userId }),
	);

export const decideSourceRetirement = createServerFn({ method: "POST" })
	.middleware([requirePermission("sources.retire")])
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

export const listResearchNotes = createServerFn({ method: "GET" })
	.middleware([requirePermission("research.manage")])
	.validator(z.object({ search: searchSchema }))
	.handler(({ data }) => listResearchNotesFromDb(db, data));

export const saveResearchNote = createServerFn({ method: "POST" })
	.middleware([requirePermission("research.manage")])
	.validator(
		z.object({
			content: z.string().trim().min(1).max(5000),
			id: idSchema.optional(),
			reference: z.string().trim().min(1).max(100),
			sources: z
				.array(
					z.object({
						locator: z.string().trim().max(200),
						sourceId: idSchema,
					}),
				)
				.max(20),
		}),
	)
	.handler(({ context, data }) =>
		saveResearchNoteInDb(db, { ...data, actorUserId: context.userId }),
	);

export const deleteResearchNote = createServerFn({ method: "POST" })
	.middleware([requirePermission("research.manage")])
	.validator(z.object({ id: idSchema }))
	.handler(({ context, data }) =>
		deleteResearchNoteInDb(db, { ...data, actorUserId: context.userId }),
	);
