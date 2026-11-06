import {
	and,
	asc,
	count,
	desc,
	eq,
	exists,
	gt,
	ilike,
	inArray,
	isNull,
	max,
	or,
	sql,
} from "drizzle-orm";

import { getPermissionKeys } from "./access";
import type { PermissionKey } from "./access-catalogue";
import { recordAudit } from "./audit";
import { readAuditDetails } from "./audit-log";
import { applyRoleChange } from "./change-kinds/role-change";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { assertActiveAccount, getRoleWithGrants } from "./role-rules";
import { accountSuspensions } from "./schema/account_suspensions";
import { auditLog } from "./schema/audit_log";
import { session, user } from "./schema/auth";
import { communityPosts } from "./schema/community_posts";
import { communityReports } from "./schema/community_reports";
import { contentRevisions } from "./schema/content_revisions";
import { editorialAssignments } from "./schema/editorial_assignments";
import { editorialReviews } from "./schema/editorial_reviews";
import { publicationHistory } from "./schema/publication_history";
import { roles } from "./schema/roles";
import { userRoles } from "./schema/user_roles";
import { listProposals, proposeChange } from "./two-person";

const PEOPLE_PAGE_SIZE = 25;

export type AccountStatus = "active" | "suspended" | "deleted";

function activeSuspensionFilter() {
	return and(
		isNull(accountSuspensions.liftedAt),
		or(
			isNull(accountSuspensions.endsAt),
			gt(accountSuspensions.endsAt, new Date()),
		),
	);
}

export async function getActiveSuspension(client: DbExecutor, userId: string) {
	const [suspension] = await client
		.select({
			id: accountSuspensions.id,
			reason: accountSuspensions.reason,
			startedAt: accountSuspensions.startedAt,
			endsAt: accountSuspensions.endsAt,
		})
		.from(accountSuspensions)
		.where(and(eq(accountSuspensions.userId, userId), activeSuspensionFilter()))
		.orderBy(desc(accountSuspensions.startedAt))
		.limit(1);

	return suspension ?? null;
}

/** Used at sign-in, so a suspended person can't start a new session. */
export async function isAccountSuspended(client: DbExecutor, userId: string) {
	return (await getActiveSuspension(client, userId)) !== null;
}

/** People, for the Users and Contributors lists. Search matches name or email. */
export async function listPeople(
	client: DbExecutor,
	input: { page: number; query?: string; staffOnly?: boolean },
) {
	const search = input.query?.trim();
	const staffRole = client
		.select({ userId: userRoles.userId })
		.from(userRoles)
		.innerJoin(roles, eq(roles.id, userRoles.roleId))
		.where(and(eq(userRoles.userId, user.id), eq(roles.autoAssign, false)));
	const where = and(
		search
			? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
			: undefined,
		input.staffOnly ? exists(staffRole) : undefined,
	);

	const [totals] = await client
		.select({ value: count() })
		.from(user)
		.where(where);
	const page = await client
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			createdAt: user.createdAt,
			deletedAt: user.deletedAt,
		})
		.from(user)
		.where(where)
		.orderBy(asc(user.name), asc(user.id))
		.limit(PEOPLE_PAGE_SIZE)
		.offset((input.page - 1) * PEOPLE_PAGE_SIZE);

	const ids = page.map(({ id }) => id);
	const roleRows = ids.length
		? await client
				.select({ userId: userRoles.userId, name: roles.name })
				.from(userRoles)
				.innerJoin(roles, eq(roles.id, userRoles.roleId))
				.where(inArray(userRoles.userId, ids))
				.orderBy(asc(roles.id))
		: [];
	const suspensionRows = ids.length
		? await client
				.selectDistinct({ userId: accountSuspensions.userId })
				.from(accountSuspensions)
				.where(
					and(
						inArray(accountSuspensions.userId, ids),
						activeSuspensionFilter(),
					),
				)
		: [];
	const suspended = new Set(suspensionRows.map(({ userId }) => userId));

	return {
		pageSize: PEOPLE_PAGE_SIZE,
		total: totals?.value ?? 0,
		people: page.map((person) => ({
			...person,
			roles: roleRows
				.filter(({ userId }) => userId === person.id)
				.map(({ name }) => name),
			status: statusOf(person.deletedAt, suspended.has(person.id)),
		})),
	};
}

function statusOf(deletedAt: Date | null, suspended: boolean): AccountStatus {
	if (deletedAt) return "deleted";
	return suspended ? "suspended" : "active";
}

async function countOf(query: PromiseLike<{ value: number }[]>) {
	const [row] = await query;
	return row?.value ?? 0;
}

/**
 * Everything administration may know about a person.
 *
 * This deliberately reads no notes, prayers, testimonies, collections or saved
 * items, and it must stay that way: private content is never shown here.
 */
export async function getPersonProfile(client: DbExecutor, userId: string) {
	const [person] = await client
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			twoFactorEnabled: user.twoFactorEnabled,
			createdAt: user.createdAt,
			deletedAt: user.deletedAt,
		})
		.from(user)
		.where(eq(user.id, userId));
	if (!person) return null;

	const roleRows = await client
		.select({ id: roles.id, name: roles.name })
		.from(userRoles)
		.innerJoin(roles, eq(roles.id, userRoles.roleId))
		.where(eq(userRoles.userId, userId))
		.orderBy(asc(roles.id));
	const heldKeys = await getPermissionKeys(client, userId);

	const suspension = await getActiveSuspension(client, userId);
	const [lastActive] = await client
		.select({ value: max(session.updatedAt) })
		.from(session)
		.where(eq(session.userId, userId));

	const [
		revisionsAuthored,
		reviewsCompleted,
		piecesPublished,
		openAssignments,
		posts,
		removals,
		reportsAgainst,
		reportsFiled,
	] = [
		await countOf(
			client
				.select({ value: count() })
				.from(contentRevisions)
				.where(eq(contentRevisions.createdByUserId, userId)),
		),
		await countOf(
			client
				.select({ value: count() })
				.from(editorialReviews)
				.where(eq(editorialReviews.reviewerUserId, userId)),
		),
		await countOf(
			client
				.select({ value: count() })
				.from(publicationHistory)
				.where(
					and(
						eq(publicationHistory.performedByUserId, userId),
						eq(publicationHistory.action, "published"),
					),
				),
		),
		await countOf(
			client
				.select({ value: count() })
				.from(editorialAssignments)
				.where(eq(editorialAssignments.assigneeUserId, userId)),
		),
		await countOf(
			client
				.select({ value: count() })
				.from(communityPosts)
				.where(eq(communityPosts.authorUserId, userId)),
		),
		await countOf(
			client
				.select({ value: count() })
				.from(communityPosts)
				.where(
					and(
						eq(communityPosts.authorUserId, userId),
						sql`${communityPosts.removedAt} IS NOT NULL`,
					),
				),
		),
		await countOf(
			client
				.select({ value: count() })
				.from(communityReports)
				.innerJoin(
					communityPosts,
					eq(communityPosts.id, communityReports.communityPostId),
				)
				.where(eq(communityPosts.authorUserId, userId)),
		),
		await countOf(
			client
				.select({ value: count() })
				.from(communityReports)
				.where(eq(communityReports.reportedByUserId, userId)),
		),
	];

	const proposals = await listProposals(client, {
		target: { type: "user", id: userId },
	});
	const proposerNames = await namesOf(
		client,
		proposals.flatMap((proposal) =>
			proposal.decidedByUserId
				? [proposal.proposerUserId, proposal.decidedByUserId]
				: [proposal.proposerUserId],
		),
	);

	const pendingRoleChanges = [];
	for (const proposal of proposals) {
		if (proposal.kind !== "role_change" || proposal.status !== "proposed") {
			continue;
		}
		const role = await getRoleWithGrants(
			client,
			Number(proposal.payload.roleId),
		);
		pendingRoleChanges.push({
			id: proposal.id,
			description: proposal.description,
			reason: proposal.reason,
			change: proposal.payload.change === "revoke" ? "revoke" : "grant",
			proposerUserId: proposal.proposerUserId,
			proposerName: proposerNames.get(proposal.proposerUserId) ?? "Someone",
			createdAt: proposal.createdAt,
			wouldGain: (role?.grants ?? []).filter((key) => !heldKeys.includes(key)),
		});
	}

	const accessCases = proposals
		.filter(({ kind }) => kind === "access_case")
		.map((proposal) => {
			const days = Number(proposal.payload.expiresInDays);
			const expiresAt =
				proposal.status === "applied" && proposal.decidedAt
					? new Date(proposal.decidedAt.getTime() + days * 86_400_000)
					: null;
			return {
				id: proposal.id,
				ground: String(proposal.payload.ground),
				scope: Array.isArray(proposal.payload.scope)
					? proposal.payload.scope.map(String)
					: [],
				reason: proposal.reason,
				status: proposal.status,
				decisionNote: proposal.decisionNote,
				expiresAt,
				expiresInDays: days,
				proposerUserId: proposal.proposerUserId,
				proposerName: proposerNames.get(proposal.proposerUserId) ?? "Someone",
				createdAt: proposal.createdAt,
			};
		});

	const roleHistory = await client
		.select({
			id: auditLog.id,
			action: auditLog.action,
			details: auditLog.details,
			occurredAt: auditLog.occurredAt,
			actorName: user.name,
		})
		.from(auditLog)
		.innerJoin(user, eq(user.id, auditLog.actorUserId))
		.where(
			and(
				eq(auditLog.targetType, "user"),
				eq(auditLog.targetId, userId),
				eq(auditLog.domain, "authorization"),
			),
		)
		.orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
		.limit(20);

	return {
		person: {
			...person,
			status: statusOf(person.deletedAt, suspension !== null),
			lastActiveAt: lastActive?.value ?? null,
			managesAdmins: heldKeys.includes("admins.manage"),
		},
		roles: roleRows,
		suspension,
		stats: {
			revisionsAuthored,
			reviewsCompleted,
			piecesPublished,
			openAssignments,
			posts,
			removals,
			reportsAgainst,
			reportsFiled,
		},
		pendingRoleChanges,
		accessCases,
		roleHistory: roleHistory.map((entry) => ({
			...entry,
			details: readAuditDetails(entry.details),
		})),
	};
}

async function namesOf(client: DbExecutor, userIds: string[]) {
	const ids = [...new Set(userIds)];
	if (ids.length === 0) return new Map<string, string>();
	const rows = await client
		.select({ id: user.id, name: user.name })
		.from(user)
		.where(inArray(user.id, ids));
	return new Map(rows.map(({ id, name }) => [id, name]));
}

/** The roles someone could be given or lose, and how each would be handled. */
export async function listAssignableRoles(client: DbExecutor) {
	const rows = await client
		.select({ id: roles.id, name: roles.name, description: roles.description })
		.from(roles)
		.orderBy(asc(roles.id));

	const assignable = [];
	for (const row of rows) {
		const role = await getRoleWithGrants(client, row.id);
		assignable.push({
			...row,
			autoAssign: role?.autoAssign ?? false,
			protected: role?.protected ?? true,
			superadminOnly: role?.grants.includes("admins.manage") ?? true,
		});
	}
	return assignable;
}

/**
 * Changes someone's roles. Ordinary roles change straight away. Protected roles
 * become proposals that a second person has to confirm.
 */
export async function changeRoles(
	client: DbExecutor,
	input: {
		actorUserId: string;
		targetUserId: string;
		grant: number[];
		revoke: number[];
		reason: string;
	},
) {
	const reason = input.reason.trim();
	if (!reason) throw new GovernanceError("Give a reason for this change.");
	if (input.actorUserId === input.targetUserId) {
		throw new GovernanceError("You can't change your own roles.");
	}

	return client.transaction(async (tx) => {
		await assertActiveAccount(tx, input.targetUserId);
		const actorKeys = await getPermissionKeys(tx, input.actorUserId);
		const canManageAdmins = actorKeys.includes("admins.manage");
		if (!canManageAdmins && !actorKeys.includes("contributors.manage")) {
			throw new GovernanceError("You don't have permission to change roles.");
		}

		const held = await tx
			.select({ roleId: userRoles.roleId })
			.from(userRoles)
			.where(eq(userRoles.userId, input.targetUserId));
		const heldIds = new Set(held.map(({ roleId }) => roleId));
		const changes = [
			...input.grant
				.filter((roleId) => !heldIds.has(roleId))
				.map((roleId) => ({ roleId, change: "grant" as const })),
			...input.revoke
				.filter((roleId) => heldIds.has(roleId))
				.map((roleId) => ({ roleId, change: "revoke" as const })),
		];

		const applied: string[] = [];
		const proposed: string[] = [];
		for (const { roleId, change } of changes) {
			const role = await getRoleWithGrants(tx, roleId);
			if (!role) throw new GovernanceError("This role no longer exists.");
			if (change === "revoke" && role.autoAssign) {
				throw new GovernanceError(
					`Everyone keeps the ${role.name} role, so it can't be removed.`,
				);
			}

			const payload = {
				targetUserId: input.targetUserId,
				roleId,
				change,
			};
			if (role.protected) {
				if (role.grants.includes("admins.manage") && !canManageAdmins) {
					throw new GovernanceError(
						`Only a Superadmin can propose changes to the ${role.name} role.`,
					);
				}
				await proposeChange(tx, {
					kind: "role_change",
					payload,
					proposerUserId: input.actorUserId,
					reason,
				});
				proposed.push(role.name);
			} else {
				await applyRoleChange(tx, payload, {
					actorUserId: input.actorUserId,
					reason,
				});
				applied.push(role.name);
			}
		}

		return { applied, proposed };
	});
}

/**
 * Suspends an account and signs it out everywhere. Anyone who can manage
 * Superadmins must lose that role first, through the two-person process, or one
 * Superadmin could silently remove the other person who has to confirm changes.
 */
export async function suspendAccount(
	client: DbExecutor,
	input: {
		actorUserId: string;
		targetUserId: string;
		reason: string;
		days: number | null;
	},
) {
	const reason = input.reason.trim();
	if (!reason) throw new GovernanceError("Give a reason for this suspension.");
	if (input.actorUserId === input.targetUserId) {
		throw new GovernanceError("You can't suspend your own account.");
	}

	await client.transaction(async (tx) => {
		await assertActiveAccount(tx, input.targetUserId);
		const targetKeys: readonly PermissionKey[] = await getPermissionKeys(
			tx,
			input.targetUserId,
		);
		if (targetKeys.includes("admins.manage")) {
			throw new GovernanceError(
				"This person manages admins. Remove that role first, which needs a second Superadmin.",
			);
		}
		if (await getActiveSuspension(tx, input.targetUserId)) {
			throw new GovernanceError("This account is already suspended.");
		}

		const endsAt = input.days
			? new Date(Date.now() + input.days * 86_400_000)
			: null;
		await tx.insert(accountSuspensions).values({
			userId: input.targetUserId,
			suspendedByUserId: input.actorUserId,
			reason,
			endsAt,
		});
		await tx.delete(session).where(eq(session.userId, input.targetUserId));
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "user.suspended",
			targetType: "user",
			targetId: input.targetUserId,
			details: { reason, days: input.days },
		});
	});
}

export async function liftSuspension(
	client: DbExecutor,
	input: { actorUserId: string; targetUserId: string; reason: string },
) {
	const reason = input.reason.trim();
	if (!reason) throw new GovernanceError("Give a reason for lifting this.");

	await client.transaction(async (tx) => {
		const suspension = await getActiveSuspension(tx, input.targetUserId);
		if (!suspension) {
			throw new GovernanceError("This account isn't suspended.");
		}
		await tx
			.update(accountSuspensions)
			.set({ liftedByUserId: input.actorUserId, liftedAt: new Date() })
			.where(eq(accountSuspensions.id, suspension.id));
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "user.suspension_lifted",
			targetType: "user",
			targetId: input.targetUserId,
			details: { reason },
		});
	});
}

/** Opens a case for exceptional access to private content, for a second person to decide. */
export async function openAccessCase(
	client: DbExecutor,
	input: {
		actorUserId: string;
		targetUserId: string;
		ground: "legal" | "safety" | "abuse";
		scope: ("notes" | "prayer_journal" | "collections" | "saved")[];
		expiresInDays: number;
		reason: string;
	},
) {
	if (input.actorUserId === input.targetUserId) {
		throw new GovernanceError("You can't open a case about yourself.");
	}

	return proposeChange(client, {
		kind: "access_case",
		payload: {
			targetUserId: input.targetUserId,
			ground: input.ground,
			scope: input.scope,
			expiresInDays: input.expiresInDays,
		},
		proposerUserId: input.actorUserId,
		reason: input.reason,
	});
}
