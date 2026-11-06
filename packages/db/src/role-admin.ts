import { and, asc, count, eq } from "drizzle-orm";

import {
	elevatedPermissions,
	isPermissionKey,
	type PermissionKey,
	permissionCatalogue,
} from "./access-catalogue";
import { recordAudit } from "./audit";
import {
	addPermissionToRole,
	getEditableRole,
	getPermissionId,
	roleHoldsPermission,
} from "./change-kinds/role-permission";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { permissions } from "./schema/permissions";
import { rolePermissions } from "./schema/role_permissions";
import { roles } from "./schema/roles";
import { userRoles } from "./schema/user_roles";
import { proposeChange } from "./two-person";

/** Every role and permission, for the Roles & Permissions screen. */
export async function getRoleMatrix(client: DbExecutor) {
	const roleRows = await client.select().from(roles).orderBy(asc(roles.id));
	const peopleCounts = await client
		.select({ roleId: userRoles.roleId, value: count() })
		.from(userRoles)
		.groupBy(userRoles.roleId);
	const grantRows = await client
		.select({ roleId: rolePermissions.roleId, key: permissions.key })
		.from(rolePermissions)
		.innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId));

	return {
		permissions: permissionCatalogue.map(
			({ key, name, category, description }) => ({
				key,
				name,
				category,
				description,
			}),
		),
		roles: roleRows.map((role) => ({
			id: role.id,
			name: role.name,
			description: role.description,
			autoAssign: role.autoAssign,
			locked: role.locked,
			people: peopleCounts.find(({ roleId }) => roleId === role.id)?.value ?? 0,
			grants: grantRows
				.filter(({ roleId }) => roleId === role.id)
				.map(({ key }) => key)
				.filter(isPermissionKey),
		})),
	};
}

export type RolePermissionChange = {
	roleId: number;
	permission: PermissionKey;
	granted: boolean;
};

/**
 * Saves permission changes together, each with its own audit entry. Adding an
 * Admin-level permission doesn't take effect yet: it waits for a second
 * Superadmin. Everything else, including removals, applies straight away.
 */
export async function saveRolePermissions(
	client: DbExecutor,
	input: {
		actorUserId: string;
		changes: RolePermissionChange[];
		reason: string;
	},
) {
	const reason = input.reason.trim();
	if (!reason) throw new GovernanceError("Give a reason for these changes.");

	return client.transaction(async (tx) => {
		let applied = 0;
		let proposed = 0;

		for (const { granted, permission, roleId } of input.changes) {
			const role = await getEditableRole(tx, roleId);
			const permissionId = await getPermissionId(tx, permission);
			const payload = { roleId, permission };

			if (!granted) {
				await tx
					.delete(rolePermissions)
					.where(
						and(
							eq(rolePermissions.roleId, roleId),
							eq(rolePermissions.permissionId, permissionId),
						),
					);
				await recordAudit(tx, {
					actorUserId: input.actorUserId,
					action: "role_permission.removed",
					targetType: "role",
					targetId: roleId,
					details: { role: role.name, permission, reason },
				});
				applied += 1;
			} else if (await roleHoldsPermission(tx, roleId, permissionId)) {
				// Already there, so there's nothing to change or to confirm.
			} else if (elevatedPermissions.has(permission)) {
				await proposeChange(tx, {
					kind: "role_permission",
					payload,
					proposerUserId: input.actorUserId,
					reason,
				});
				proposed += 1;
			} else {
				await addPermissionToRole(tx, payload, {
					actorUserId: input.actorUserId,
					reason,
				});
				applied += 1;
			}
		}

		return { applied, proposed };
	});
}

/** Creates a role with no permissions. They are added in the matrix afterwards. */
export async function createRole(
	client: DbExecutor,
	input: { actorUserId: string; name: string; description: string },
) {
	const name = input.name.trim();
	const description = input.description.trim();
	if (!name) throw new GovernanceError("Give the role a name.");

	return client.transaction(async (tx) => {
		const existing = await tx.select({ name: roles.name }).from(roles);
		if (
			existing.some((role) => role.name.toLowerCase() === name.toLowerCase())
		) {
			throw new GovernanceError(`A role called ${name} already exists.`);
		}

		const [role] = await tx
			.insert(roles)
			.values({ name, description: description || null })
			.returning({ id: roles.id });
		if (!role) throw new Error("Could not save the role.");

		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "role.created",
			targetType: "role",
			targetId: role.id,
			details: { role: name },
		});

		return role.id;
	});
}
