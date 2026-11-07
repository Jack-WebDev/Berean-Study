import { relations, sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import type { ContentRevisionStatus } from "../content-kinds";
import { user } from "./auth";
import { citations } from "./citations";
import { contentItems } from "./content_items";

/**
 * Every version of a piece of content, numbered. A draft can change. Once it is
 * submitted its wording is fixed, which a database trigger enforces, so publishing
 * always refers to exactly what was reviewed. Any later edit is a new revision.
 */
export const contentRevisions = pgTable(
	"content_revisions",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		contentItemId: integer("content_item_id")
			.notNull()
			.references(() => contentItems.id, { onDelete: "restrict" }),

		number: integer().notNull(),

		body: jsonb().$type<unknown>().notNull(),

		status: text().$type<ContentRevisionStatus>().notNull().default("draft"),

		/** The author. */
		createdByUserId: text("created_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		basedOnRevisionId: integer("based_on_revision_id").references(
			(): AnyPgColumn => contentRevisions.id,
			{ onDelete: "restrict" },
		),

		reviewerUserId: text("reviewer_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),

		submittedAt: timestamp("submitted_at", { withTimezone: true }),

		approvedAt: timestamp("approved_at", { withTimezone: true }),

		publishedAt: timestamp("published_at", { withTimezone: true }),

		publishedByUserId: text("published_by_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		unique("content_revisions_item_number_unique").on(
			table.contentItemId,
			table.number,
		),

		uniqueIndex("content_revisions_one_open_idx")
			.on(table.contentItemId)
			.where(
				sql`${table.status} IN ('draft', 'submitted', 'in_review', 'approved')`,
			),

		uniqueIndex("content_revisions_one_published_idx")
			.on(table.contentItemId)
			.where(sql`${table.status} = 'published'`),

		index("content_revisions_status_idx").on(table.status),

		index("content_revisions_created_by_created_at_idx").on(
			table.createdByUserId,
			table.createdAt,
		),

		check(
			"content_revisions_status_check",
			sql`${table.status} IN (
				'draft',
				'submitted',
				'in_review',
				'changes_requested',
				'approved',
				'published',
				'superseded',
				'withdrawn'
			)`,
		),

		check("content_revisions_number_positive_check", sql`${table.number} > 0`),

		// The rule at the heart of review, kept here so no code path can skip it.
		check(
			"content_revisions_second_person_check",
			sql`${table.reviewerUserId} IS NULL OR ${table.reviewerUserId} <> ${table.createdByUserId}`,
		),

		check(
			"content_revisions_approved_has_reviewer_check",
			sql`${table.status} NOT IN ('approved', 'published', 'superseded', 'withdrawn')
				OR (${table.reviewerUserId} IS NOT NULL AND ${table.approvedAt} IS NOT NULL)`,
		),

		check(
			"content_revisions_published_state_check",
			sql`${table.status} NOT IN ('published', 'superseded', 'withdrawn')
				OR (${table.publishedAt} IS NOT NULL AND ${table.publishedByUserId} IS NOT NULL)`,
		),
	],
);

export const contentRevisionsRelations = relations(
	contentRevisions,
	({ many }) => ({
		citations: many(citations),
	}),
);
