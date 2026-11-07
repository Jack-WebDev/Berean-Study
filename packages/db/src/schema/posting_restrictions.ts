import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/** Periods when someone can't share with Community. They can still read and report. */
export const postingRestrictions = pgTable(
	"posting_restrictions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		restrictedByUserId: text("restricted_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		startedAt: timestamp("started_at", { withTimezone: true })
			.notNull()
			.defaultNow(),

		endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),

		liftedByUserId: text("lifted_by_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),

		liftedAt: timestamp("lifted_at", { withTimezone: true }),
	},
	(table) => [
		check(
			"posting_restrictions_ends_after_start_check",
			sql`${table.endsAt} > ${table.startedAt}`,
		),

		check(
			"posting_restrictions_lifted_state_check",
			sql`(${table.liftedByUserId} IS NULL) = (${table.liftedAt} IS NULL)`,
		),

		index("posting_restrictions_user_idx").on(table.userId, table.endsAt),
	],
);
