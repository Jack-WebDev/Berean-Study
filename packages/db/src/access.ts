import { count, desc, eq } from "drizzle-orm";

import { isPermissionKey, type PermissionKey } from "./access-catalogue";
import type { DbExecutor } from "./db-executor";
import { permissions } from "./schema/permissions";
import { rolePermissions } from "./schema/role_permissions";
import { roles } from "./schema/roles";
import { userRoles } from "./schema/user_roles";

/** What someone may do, granted through all of their roles. */
export async function getPermissionKeys(
	client: DbExecutor,
	userId: string,
): Promise<PermissionKey[]> {
	const rows = await client
		.selectDistinct({ key: permissions.key })
		.from(userRoles)
		.innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
		.innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
		.where(eq(userRoles.userId, userId));

	return rows.map(({ key }) => key).filter(isPermissionKey);
}

/**
 * The role that best describes someone, for display only: the one granting the
 * most permissions. Working this out from the grants rather than from role names
 * means custom roles rank correctly too. Decide what someone may do with
 * `getPermissionKeys`, never with this.
 */
export async function getPrimaryRole(client: DbExecutor, userId: string) {
	const [role] = await client
		.select({ name: roles.name, autoAssign: roles.autoAssign })
		.from(userRoles)
		.innerJoin(roles, eq(roles.id, userRoles.roleId))
		.leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
		.where(eq(userRoles.userId, userId))
		.groupBy(roles.id)
		.orderBy(desc(count(rolePermissions.permissionId)), roles.name)
		.limit(1);

	return role ?? null;
}

/** Gives a new account the roles every member starts with. */
export async function assignSignUpRoles(client: DbExecutor, userId: string) {
	const signUpRoles = await client
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.autoAssign, true));
	if (signUpRoles.length === 0) return;

	await client
		.insert(userRoles)
		.values(signUpRoles.map(({ id }) => ({ userId, roleId: id })))
		.onConflictDoNothing();
}
