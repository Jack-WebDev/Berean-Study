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

/** Every suspension an account has had. No end date means until someone lifts it. */
export const accountSuspensions = pgTable(
	"account_suspensions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		suspendedByUserId: text("suspended_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		reason: text().notNull(),

		startedAt: timestamp("started_at", { withTimezone: true })
			.notNull()
			.defaultNow(),

		endsAt: timestamp("ends_at", { withTimezone: true }),

		liftedByUserId: text("lifted_by_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),

		liftedAt: timestamp("lifted_at", { withTimezone: true }),
	},
	(table) => [
		check(
			"account_suspensions_reason_not_blank_check",
			sql`btrim(${table.reason}) <> ''`,
		),

		check(
			"account_suspensions_ends_after_start_check",
			sql`${table.endsAt} IS NULL OR ${table.endsAt} > ${table.startedAt}`,
		),

		check(
			"account_suspensions_lifted_state_check",
			sql`(${table.liftedByUserId} IS NULL) = (${table.liftedAt} IS NULL)`,
		),

		index("account_suspensions_user_idx").on(table.userId, table.startedAt),
	],
);
