import { and, asc, count, eq } from "drizzle-orm";

import {
	isPermissionKey,
	type PermissionKey,
	permissionCatalogue,
} from "./access-catalogue";
import { recordAudit } from "./audit";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { permissions } from "./schema/permissions";
import { rolePermissions } from "./schema/role_permissions";
import { roles } from "./schema/roles";
import { userRoles } from "./schema/user_roles";

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

/** Saves permission changes together, each with its own audit entry. */
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

	await client.transaction(async (tx) => {
		const permissionRows = await tx
			.select({ id: permissions.id, key: permissions.key })
			.from(permissions);

		for (const change of input.changes) {
			const [role] = await tx
				.select({ name: roles.name, locked: roles.locked })
				.from(roles)
				.where(eq(roles.id, change.roleId));
			if (!role) throw new GovernanceError("This role no longer exists.");
			if (role.locked) {
				throw new GovernanceError(`${role.name} permissions can't be changed.`);
			}
			const permissionId = permissionRows.find(
				({ key }) => key === change.permission,
			)?.id;
			if (!permissionId) {
				throw new GovernanceError("This permission no longer exists.");
			}

			if (change.granted) {
				await tx
					.insert(rolePermissions)
					.values({ roleId: change.roleId, permissionId })
					.onConflictDoNothing();
			} else {
				await tx
					.delete(rolePermissions)
					.where(
						and(
							eq(rolePermissions.roleId, change.roleId),
							eq(rolePermissions.permissionId, permissionId),
						),
					);
			}

			await recordAudit(tx, {
				actorUserId: input.actorUserId,
				action: change.granted
					? "role_permission.added"
					: "role_permission.removed",
				targetType: "role",
				targetId: change.roleId,
				details: { role: role.name, permission: change.permission, reason },
			});
		}
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
