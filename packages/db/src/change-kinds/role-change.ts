import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "../audit";
import type { DbExecutor } from "../db-executor";
import { GovernanceError } from "../governance-error";
import {
	assertActiveAccount,
	assertSuperadminsRemainAfterRemoving,
	getRoleWithGrants,
} from "../role-rules";
import { user } from "../schema/auth";
import { userRoles } from "../schema/user_roles";
import type { ChangeDecision, ChangeKindDefinition } from "../two-person";

const roleChangePayload = z.object({
	targetUserId: z.string().min(1),
	roleId: z.number().int().positive(),
	change: z.enum(["grant", "revoke"]),
});

export type RoleChangePayload = z.infer<typeof roleChangePayload>;

/** Puts a role change into effect and records it. Assumes all permission checks have passed. */
export async function applyRoleChange(
	client: DbExecutor,
	payload: RoleChangePayload,
	context: { actorUserId: string; reason: string; proposalId?: number },
) {
	const role = await getRoleWithGrants(client, payload.roleId);
	if (!role) throw new GovernanceError("This role no longer exists.");

	if (payload.change === "grant") {
		await client
			.insert(userRoles)
			.values({ userId: payload.targetUserId, roleId: payload.roleId })
			.onConflictDoNothing();
	} else {
		await client
			.delete(userRoles)
			.where(
				and(
					eq(userRoles.userId, payload.targetUserId),
					eq(userRoles.roleId, payload.roleId),
				),
			);
	}

	await recordAudit(client, {
		actorUserId: context.actorUserId,
		action: payload.change === "grant" ? "role.granted" : "role.revoked",
		targetType: "user",
		targetId: payload.targetUserId,
		details: {
			role: role.name,
			reason: context.reason,
			...(context.proposalId ? { proposalId: context.proposalId } : {}),
		},
	});
}

export const roleChangeKind: ChangeKindDefinition<RoleChangePayload> = {
	payload: roleChangePayload,
	decidePermission: "admins.manage",
	title: "Role change",
	target: ({ targetUserId }) => ({ type: "user", id: targetUserId }),
	destination: ({ targetUserId }) => `/admin/users/${targetUserId}`,
	async describe(client, { targetUserId, roleId, change }) {
		const role = await getRoleWithGrants(client, roleId);
		const [person] = await client
			.select({ name: user.name })
			.from(user)
			.where(eq(user.id, targetUserId));
		const roleName = role?.name ?? "removed";
		const name = person?.name ?? "Someone";
		return change === "grant"
			? `Giving ${name} the ${roleName} role`
			: `Removing the ${roleName} role from ${name}`;
	},
	async assertAllowed(client, { targetUserId, change }) {
		await assertActiveAccount(client, targetUserId);
		if (change === "revoke") {
			await assertSuperadminsRemainAfterRemoving(client, targetUserId);
		}
	},
	assertDecider({ targetUserId }, deciderUserId) {
		if (targetUserId === deciderUserId) {
			throw new GovernanceError(
				"This change is about you, so someone else has to decide it.",
			);
		}
	},
	apply: (client, payload, { deciderUserId, proposalId, reason }) =>
		applyRoleChange(client, payload, {
			actorUserId: deciderUserId,
			proposalId,
			reason,
		}),
	proposedAction: "promotion.requested",
	decidedAction: (_decision: ChangeDecision) => "promotion.decided",
	alsoNotifyOnDecision: ({ targetUserId }) => [targetUserId],
};
