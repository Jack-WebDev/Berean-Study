import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { isPermissionKey } from "../access-catalogue";
import { recordAudit } from "../audit";
import type { DbExecutor } from "../db-executor";
import { GovernanceError } from "../governance-error";
import { permissions } from "../schema/permissions";
import { rolePermissions } from "../schema/role_permissions";
import { roles } from "../schema/roles";
import type { ChangeKindDefinition } from "../two-person";

const rolePermissionPayload = z.object({
	roleId: z.number().int().positive(),
	permission: z.string().refine(isPermissionKey),
});

export type RolePermissionPayload = z.infer<typeof rolePermissionPayload>;

export async function getEditableRole(client: DbExecutor, roleId: number) {
	const [role] = await client
		.select({ name: roles.name, locked: roles.locked })
		.from(roles)
		.where(eq(roles.id, roleId));
	if (!role) throw new GovernanceError("This role no longer exists.");
	if (role.locked) {
		throw new GovernanceError(`${role.name} permissions can't be changed.`);
	}
	return role;
}

export async function getPermissionId(client: DbExecutor, key: string) {
	const [permission] = await client
		.select({ id: permissions.id })
		.from(permissions)
		.where(eq(permissions.key, key));
	if (!permission) {
		throw new GovernanceError("This permission no longer exists.");
	}
	return permission.id;
}

export async function roleHoldsPermission(
	client: DbExecutor,
	roleId: number,
	permissionId: number,
) {
	const [row] = await client
		.select({ roleId: rolePermissions.roleId })
		.from(rolePermissions)
		.where(
			and(
				eq(rolePermissions.roleId, roleId),
				eq(rolePermissions.permissionId, permissionId),
			),
		);
	return row !== undefined;
}

/** Adds a permission to a role and records it. Assumes all checks have passed. */
export async function addPermissionToRole(
	client: DbExecutor,
	payload: RolePermissionPayload,
	context: { actorUserId: string; reason: string; proposalId?: number },
) {
	const role = await getEditableRole(client, payload.roleId);
	const permissionId = await getPermissionId(client, payload.permission);

	await client
		.insert(rolePermissions)
		.values({ roleId: payload.roleId, permissionId })
		.onConflictDoNothing();
	await recordAudit(client, {
		actorUserId: context.actorUserId,
		action: "role_permission.added",
		targetType: "role",
		targetId: payload.roleId,
		details: {
			role: role.name,
			permission: payload.permission,
			reason: context.reason,
			...(context.proposalId ? { proposalId: context.proposalId } : {}),
		},
	});
}

/**
 * Adding an Admin-level permission to a role instantly gives it to everyone in
 * that role, so it needs a second Superadmin, just like granting the role would.
 */
export const rolePermissionKind: ChangeKindDefinition<RolePermissionPayload> = {
	payload: rolePermissionPayload,
	decidePermission: "roles.manage",
	title: "Role permission change",
	target: ({ roleId }) => ({ type: "role", id: String(roleId) }),
	destination: () => "/admin/roles",
	async describe(client, { roleId, permission }) {
		const [role] = await client
			.select({ name: roles.name })
			.from(roles)
			.where(eq(roles.id, roleId));
		return `Adding ${permission} to the ${role?.name ?? "removed"} role`;
	},
	async assertAllowed(client, { roleId, permission }) {
		await getEditableRole(client, roleId);
		await getPermissionId(client, permission);
	},
	apply: (client, payload, { deciderUserId, proposalId, reason }) =>
		addPermissionToRole(client, payload, {
			actorUserId: deciderUserId,
			proposalId,
			reason,
		}),
	proposedAction: "role_permission.proposed",
	decidedAction: () => "role_permission.decided",
};
