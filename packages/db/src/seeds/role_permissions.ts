import { rolePermissions } from "../schema/role_permissions";
import { db, numberId, type SeedContext } from "./utils";

const permissionIndexesByRole = [
	[0, 8],
	[0, 1, 2, 5, 6, 8],
	[0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
	[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
] as const;

export async function seedRolePermissions(context: SeedContext): Promise<void> {
	await db.insert(rolePermissions).values(
		permissionIndexesByRole.flatMap((permissionIndexes, roleIndex) =>
			permissionIndexes.map((permissionIndex) => ({
				roleId: numberId(context, "roles", roleIndex),
				permissionId: numberId(context, "permissions", permissionIndex),
			})),
		),
	);
}
