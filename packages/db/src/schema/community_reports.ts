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
import { communityPosts } from "./community_posts";

export const communityReports = pgTable(
	"community_reports",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		communityPostId: integer("community_post_id")
			.notNull()
			.references(() => communityPosts.id, {
				onDelete: "restrict",
			}),

		reportedByUserId: text("reported_by_user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "restrict",
			}),

		/**
		 * Machine-readable moderation category.
		 *
		 * Examples:
		 * spam
		 * harassment
		 * inappropriate
		 * privacy
		 * impersonation
		 * other
		 *
		 * The allowed taxonomy should remain application-controlled
		 * for now because Community moderation requirements may evolve.
		 */
		reason: text("reason").notNull(),

		/**
		 * Optional explanation from the member submitting the report.
		 */
		details: text("details"),

		/**
		 * NULL means the report is still awaiting moderation.
		 *
		 * Completed values:
		 * - dismissed
		 * - action_taken
		 */
		resolution: text("resolution"),

		/**
		 * User who completed the moderation review.
		 *
		 * Authorization determines who may moderate Community content;
		 * this should not be tied directly to contributor status.
		 */
		reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),

		reviewedAt: timestamp("reviewed_at", {
			withTimezone: true,
		}),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),
	},
	(table) => [
		/**
		 * Main moderation queue:
		 *
		 * WHERE resolution IS NULL
		 * ORDER BY created_at
		 */
		index("community_reports_resolution_created_at_idx").on(
			table.resolution,
			table.createdAt,
		),

		/**
		 * Supports viewing all reports associated with a Community post.
		 */
		index("community_reports_community_post_id_idx").on(table.communityPostId),

		check(
			"community_reports_reason_not_blank",
			sql`btrim(${table.reason}) <> ''`,
		),

		check(
			"community_reports_details_not_blank",
			sql`${table.details} IS NULL OR btrim(${table.details}) <> ''`,
		),

		check(
			"community_reports_resolution_valid",
			sql`${table.resolution} IS NULL OR ${table.resolution} IN (
				'dismissed',
				'action_taken'
			)`,
		),

		/**
		 * A report is either:
		 *
		 * Open:
		 *   resolution = NULL
		 *   reviewed_by_user_id = NULL
		 *   reviewed_at = NULL
		 *
		 * Completed:
		 *   resolution != NULL
		 *   reviewed_by_user_id != NULL
		 *   reviewed_at != NULL
		 */
		check(
			"community_reports_review_state_consistent",
			sql`
				(
					${table.resolution} IS NULL
					AND ${table.reviewedByUserId} IS NULL
					AND ${table.reviewedAt} IS NULL
				)
				OR
				(
					${table.resolution} IS NOT NULL
					AND ${table.reviewedByUserId} IS NOT NULL
					AND ${table.reviewedAt} IS NOT NULL
				)
			`,
		),
	],
);
