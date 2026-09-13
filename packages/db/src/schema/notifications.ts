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

export const notifications = pgTable(
	"notifications",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		/**
		 * Machine-readable notification category.
		 *
		 * Examples:
		 * editorial_assignment
		 * editorial_review
		 * content_issue
		 * content_issue_comment
		 * publication
		 * system
		 */
		kind: text("kind").notNull(),

		title: text("title").notNull(),

		body: text("body").notNull(),

		/**
		 * Optional in-app destination opened when the user
		 * selects the notification.
		 *
		 * Example:
		 * /admin/reviews/381
		 */
		destination: text("destination"),

		/**
		 * NULL means the notification is unread.
		 */
		readAt: timestamp("read_at", {
			withTimezone: true,
		}),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("notifications_user_created_at_idx").on(
			table.userId,
			table.createdAt.desc(),
		),

		index("notifications_user_unread_created_at_idx")
			.on(table.userId, table.createdAt.desc())
			.where(sql`${table.readAt} IS NULL`),

		check("notifications_kind_not_blank", sql`btrim(${table.kind}) <> ''`),

		check("notifications_title_not_blank", sql`btrim(${table.title}) <> ''`),

		check("notifications_body_not_blank", sql`btrim(${table.body}) <> ''`),

		check(
			"notifications_destination_not_blank",
			sql`${table.destination} IS NULL OR btrim(${table.destination}) <> ''`,
		),
	],
);
