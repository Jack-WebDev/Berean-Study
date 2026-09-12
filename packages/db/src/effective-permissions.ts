import { eq } from "drizzle-orm";

import { db } from "./index";
import { permissions } from "./schema/permissions";
import { rolePermissions } from "./schema/role_permissions";
import { userRoles } from "./schema/user_roles";

/** Returns the union of permissions granted by every role assigned to a user. */
export async function getEffectivePermissionKeys(userId: string) {
	const rows = await db
		.select({ key: permissions.key })
		.from(userRoles)
		.innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
		.innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
		.where(eq(userRoles.userId, userId));

	return [...new Set(rows.map(({ key }) => key))];
}
