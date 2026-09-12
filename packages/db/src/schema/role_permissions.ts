import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { permissions } from "./permissions";
import { roles } from "./roles";

export const rolePermissions = pgTable(
	"role_permissions",
	{
		roleId: integer("role_id")
			.notNull()
			.references(() => roles.id, {
				onDelete: "restrict",
			}),

		permissionId: integer("permission_id")
			.notNull()
			.references(() => permissions.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.roleId, table.permissionId],
		}),

		index("role_permissions_permission_id_idx").on(table.permissionId),
	],
);
