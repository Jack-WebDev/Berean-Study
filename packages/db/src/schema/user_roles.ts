import { index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { roles } from "./roles";

export const userRoles = pgTable(
	"user_roles",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		roleId: integer("role_id")
			.notNull()
			.references(() => roles.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.userId, table.roleId],
		}),

		index("user_roles_role_id_idx").on(table.roleId),
	],
);
