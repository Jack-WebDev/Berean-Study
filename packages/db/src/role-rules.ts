import { and, count, eq, inArray } from "drizzle-orm";

import {
	elevatedPermissions,
	isPermissionKey,
	type PermissionKey,
} from "./access-catalogue";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { user } from "./schema/auth";
import { permissions } from "./schema/permissions";
import { rolePermissions } from "./schema/role_permissions";
import { roles } from "./schema/roles";
import { userRoles } from "./schema/user_roles";

/** The two-person rule stops working with fewer than this many Superadmins. */
const MINIMUM_SUPERADMINS = 2;

export type RoleWithGrants = {
	id: number;
	name: string;
	autoAssign: boolean;
	locked: boolean;
	grants: PermissionKey[];
	/** Granting or removing this role needs a second person. */
	protected: boolean;
};

export async function getRoleWithGrants(
	client: DbExecutor,
	roleId: number,
): Promise<RoleWithGrants | null> {
	const [role] = await client.select().from(roles).where(eq(roles.id, roleId));
	if (!role) return null;

	const rows = await client
		.select({ key: permissions.key })
		.from(rolePermissions)
		.innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
		.where(eq(rolePermissions.roleId, roleId));
	const grants = rows.map(({ key }) => key).filter(isPermissionKey);

	return {
		id: role.id,
		name: role.name,
		autoAssign: role.autoAssign,
		locked: role.locked,
		grants,
		protected:
			role.locked || grants.some((key) => elevatedPermissions.has(key)),
	};
}

/** Accounts that have been deleted or never existed can't be acted on. */
export async function assertActiveAccount(client: DbExecutor, userId: string) {
	const [account] = await client
		.select({ deletedAt: user.deletedAt })
		.from(user)
		.where(eq(user.id, userId));
	if (!account || account.deletedAt) {
		throw new GovernanceError("This account no longer exists.");
	}
}

/**
 * Refuses anything that would leave too few Superadmins for a second person to
 * ever confirm a change again.
 */
export async function assertSuperadminsRemainAfterRemoving(
	client: DbExecutor,
	userId: string,
) {
	const lockedRoles = client
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.locked, true));
	const [held] = await client
		.select({ value: count() })
		.from(userRoles)
		.where(
			and(eq(userRoles.userId, userId), inArray(userRoles.roleId, lockedRoles)),
		);
	if (!held?.value) return;

	const [holders] = await client
		.select({ value: count() })
		.from(userRoles)
		.where(inArray(userRoles.roleId, lockedRoles));
	if ((holders?.value ?? 0) <= MINIMUM_SUPERADMINS) {
		throw new GovernanceError(
			`Berean Study must keep at least ${MINIMUM_SUPERADMINS} Superadmins, so a second person can always confirm changes. Add another Superadmin first.`,
		);
	}
}
