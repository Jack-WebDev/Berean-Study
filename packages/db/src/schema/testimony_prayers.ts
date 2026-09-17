import {
	foreignKey,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";

import { prayers } from "./prayers";
import { testimonies } from "./testimonies";

export const testimonyPrayers = pgTable(
	"testimony_prayers",
	{
		testimonyId: integer("testimony_id").notNull(),

		prayerId: integer("prayer_id").notNull(),

		userId: text("user_id").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.testimonyId, table.prayerId],
		}),

		foreignKey({
			columns: [table.testimonyId, table.userId],
			foreignColumns: [testimonies.id, testimonies.userId],
			name: "testimony_prayers_testimony_owner_fk",
		}).onDelete("cascade"),

		foreignKey({
			columns: [table.prayerId, table.userId],
			foreignColumns: [prayers.id, prayers.userId],
			name: "testimony_prayers_prayer_owner_fk",
		}).onDelete("cascade"),

		index("testimony_prayers_prayer_id_idx").on(table.prayerId),
	],
);
