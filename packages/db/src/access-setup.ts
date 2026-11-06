import { eq, sql } from "drizzle-orm";

import { permissionCatalogue, roleCatalogue } from "./access-catalogue";
import { recordAudit } from "./audit";
import type { DbExecutor } from "./db-executor";
import { user } from "./schema/auth";
import { permissions } from "./schema/permissions";
import { rolePermissions } from "./schema/role_permissions";
import { roles } from "./schema/roles";
import { userRoles } from "./schema/user_roles";

/** The two-person rule needs this many Superadmins before it can work. */
const FOUNDING_SUPERADMIN_LIMIT = 2;

/**
 * Brings the database's permissions and roles in line with the catalogue. Safe
 * to run repeatedly.
 *
 * Changes made on the Roles screen survive: a role only receives its catalogue
 * grants when the role or the permission is brand new. Locked roles are the
 * exception and always hold every permission.
 *
 * Accounts with no role at all receive the sign-up roles, which repairs accounts
 * created before roles were assigned automatically.
 *
 * Returns the role ids in catalogue order.
 */
export async function applyAccessCatalogue(client: DbExecutor) {
	return client.transaction(async (tx) => {
		const existingPermissions = await tx
			.select({ key: permissions.key })
			.from(permissions);
		const existingRoles = await tx
			.select({ id: roles.id, name: roles.name })
			.from(roles);
		const knownKeys = new Set(existingPermissions.map(({ key }) => key));

		const savedPermissions = await tx
			.insert(permissions)
			.values([...permissionCatalogue])
			.onConflictDoUpdate({
				target: permissions.key,
				set: {
					name: sql`excluded.name`,
					category: sql`excluded.category`,
					description: sql`excluded.description`,
				},
			})
			.returning({ id: permissions.id, key: permissions.key });
		const permissionIdByKey = new Map(
			savedPermissions.map(({ id, key }) => [key, id]),
		);

		const roleIds: number[] = [];
		for (const definition of roleCatalogue) {
			const existing = existingRoles.find(
				({ name }) => name.toLowerCase() === definition.name.toLowerCase(),
			);
			const values = {
				name: definition.name,
				description: definition.description,
				autoAssign: definition.autoAssign,
				locked: definition.locked,
			};
			const [saved] = existing
				? await tx
						.update(roles)
						.set(values)
						.where(eq(roles.id, existing.id))
						.returning({ id: roles.id })
				: await tx.insert(roles).values(values).returning({ id: roles.id });
			if (!saved) throw new Error(`Could not save role ${definition.name}.`);
			roleIds.push(saved.id);

			const grantRows = definition.grants
				.filter((key) => definition.locked || !existing || !knownKeys.has(key))
				.flatMap((key) => {
					const permissionId = permissionIdByKey.get(key);
					return permissionId ? [{ roleId: saved.id, permissionId }] : [];
				});
			if (grantRows.length > 0) {
				await tx
					.insert(rolePermissions)
					.values(grantRows)
					.onConflictDoNothing();
			}
		}

		await tx.execute(sql`
			INSERT INTO ${userRoles} (user_id, role_id)
			SELECT ${user.id}, ${roles.id}
			FROM ${user}
			CROSS JOIN ${roles}
			WHERE ${roles.autoAssign}
				AND NOT EXISTS (
					SELECT 1 FROM ${userRoles} WHERE ${userRoles.userId} = ${user.id}
				)
		`);

		return roleIds;
	});
}

export type FoundingSuperadminResult = "granted" | "already-superadmin";

/**
 * Makes one of the two founding Superadmins. This is the only way in that skips
 * the second-person rule, because until two Superadmins exist there is nobody to
 * confirm anything. It stops working as soon as there are two.
 */
export async function grantFoundingSuperadmin(
	client: DbExecutor,
	email: string,
): Promise<FoundingSuperadminResult> {
	return client.transaction(async (tx) => {
		// Holding this row lock stops two simultaneous runs both passing the limit.
		const [superadminRole] = await tx
			.select({ id: roles.id, name: roles.name })
			.from(roles)
			.where(eq(roles.locked, true))
			.for("update");
		if (!superadminRole) {
			throw new Error(
				"The Superadmin role doesn't exist yet. Run db:access:sync first.",
			);
		}

		const [account] = await tx
			.select({ id: user.id })
			.from(user)
			.where(eq(sql`lower(${user.email})`, email.trim().toLowerCase()));
		if (!account) {
			throw new Error(
				`No account uses ${email}. Register that account first, then run this again.`,
			);
		}

		const holders = await tx
			.select({ userId: userRoles.userId })
			.from(userRoles)
			.where(eq(userRoles.roleId, superadminRole.id));
		if (holders.some(({ userId }) => userId === account.id)) {
			return "already-superadmin";
		}
		if (holders.length >= FOUNDING_SUPERADMIN_LIMIT) {
			throw new Error(
				"Two Superadmins already exist. New Superadmins must be proposed in the app and confirmed by a second Superadmin.",
			);
		}

		await tx
			.insert(userRoles)
			.values({ userId: account.id, roleId: superadminRole.id });
		await recordAudit(tx, {
			actorUserId: account.id,
			action: "role.granted",
			targetType: "user",
			targetId: account.id,
			details: {
				role: superadminRole.name,
				via: "founding-superadmin-script",
			},
		});

		return "granted";
	});
}
