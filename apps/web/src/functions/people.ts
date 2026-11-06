import { db } from "@berean-study/db";
import {
	changeRoles as changeRolesInDb,
	getPersonProfile as getPersonProfileFromDb,
	liftSuspension as liftSuspensionInDb,
	listAssignableRoles as listAssignableRolesFromDb,
	listPeople as listPeopleFromDb,
	openAccessCase as openAccessCaseInDb,
	suspendAccount as suspendAccountInDb,
} from "@berean-study/db/people";
import {
	decideChange as decideChangeInDb,
	listProposals,
} from "@berean-study/db/two-person";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const userIdSchema = z.string().min(1);
const roleIdsSchema = z.array(z.number().int().positive()).max(50);
const reasonSchema = z.string().trim().min(1).max(1000);

export const listPeople = createServerFn({ method: "GET" })
	.middleware([requirePermission("contributors.manage", "admins.manage")])
	.validator(
		z.object({
			page: z.number().int().positive(),
			query: z.string().trim().max(200).optional(),
			staffOnly: z.boolean().optional(),
		}),
	)
	.handler(({ data }) => listPeopleFromDb(db, data));

export const getPersonProfile = createServerFn({ method: "GET" })
	.middleware([requirePermission("contributors.manage", "admins.manage")])
	.validator(z.object({ userId: userIdSchema }))
	.handler(({ data }) => getPersonProfileFromDb(db, data.userId));

export const listAssignableRoles = createServerFn({ method: "GET" })
	.middleware([requirePermission("contributors.manage", "admins.manage")])
	.handler(() => listAssignableRolesFromDb(db));

/** Changes waiting for a second person, shown at the top of the Users page. */
export const listPendingChanges = createServerFn({ method: "GET" })
	.middleware([requirePermission("admins.manage")])
	.handler(async () => {
		const proposals = await listProposals(db, { status: "proposed" });
		return proposals.map((proposal) => ({
			id: proposal.id,
			title: proposal.title,
			description: proposal.description,
			reason: proposal.reason,
			destination: proposal.destination,
			proposerUserId: proposal.proposerUserId,
			createdAt: proposal.createdAt,
		}));
	});

export const changeRoles = createServerFn({ method: "POST" })
	.middleware([requirePermission("contributors.manage", "admins.manage")])
	.validator(
		z.object({
			targetUserId: userIdSchema,
			grant: roleIdsSchema,
			revoke: roleIdsSchema,
			reason: reasonSchema,
		}),
	)
	.handler(({ context, data }) =>
		changeRolesInDb(db, { ...data, actorUserId: context.userId }),
	);

export const decideChange = createServerFn({ method: "POST" })
	.middleware([requirePermission("admins.manage")])
	.validator(
		z.object({
			proposalId: z.number().int().positive(),
			decision: z.enum(["confirm", "reject"]),
			note: reasonSchema,
		}),
	)
	.handler(({ context, data }) =>
		decideChangeInDb(db, { ...data, deciderUserId: context.userId }),
	);

export const suspendAccount = createServerFn({ method: "POST" })
	.middleware([requirePermission("admins.manage")])
	.validator(
		z.object({
			targetUserId: userIdSchema,
			reason: reasonSchema,
			days: z.number().int().min(1).max(365).nullable(),
		}),
	)
	.handler(({ context, data }) =>
		suspendAccountInDb(db, { ...data, actorUserId: context.userId }),
	);

export const liftSuspension = createServerFn({ method: "POST" })
	.middleware([requirePermission("admins.manage")])
	.validator(z.object({ targetUserId: userIdSchema, reason: reasonSchema }))
	.handler(({ context, data }) =>
		liftSuspensionInDb(db, { ...data, actorUserId: context.userId }),
	);

export const openAccessCase = createServerFn({ method: "POST" })
	.middleware([requirePermission("admins.manage")])
	.validator(
		z.object({
			targetUserId: userIdSchema,
			ground: z.enum(["legal", "safety", "abuse"]),
			scope: z
				.array(z.enum(["notes", "prayer_journal", "collections", "saved"]))
				.min(1),
			expiresInDays: z.number().int().min(1).max(90),
			reason: reasonSchema,
		}),
	)
	.handler(({ context, data }) =>
		openAccessCaseInDb(db, { ...data, actorUserId: context.userId }),
	);
