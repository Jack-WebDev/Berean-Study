import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Something Berean Study says is true, and which has to trace back to a source.
 * Its statement, confidence and citations live in reviewed revisions.
 */
export const claims = pgTable("claims", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),

	createdByUserId: text("created_by_user_id")
		.notNull()
		.references(() => user.id, { onDelete: "restrict" }),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
