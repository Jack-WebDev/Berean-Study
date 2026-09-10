import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bookIntroductionSections } from "./book_introduction_sections";
import { citations } from "./citations";
import { commentaries } from "./commentaries";
import { commentarySections } from "./commentary_sections";

export const contentRevisions = pgTable(
	"content_revisions",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		content: text("content").notNull(),

		title: text("title"),

		position: integer("position"),

		createdByUserId: text("created_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),

		bookIntroductionSectionId: integer(
			"book_introduction_section_id",
		).references(() => bookIntroductionSections.id, {
			onDelete: "restrict",
		}),

		commentaryPassageId: integer("commentary_passage_id").references(
			() => commentaries.passageId,
			{ onDelete: "restrict" },
		),

		commentarySectionId: integer("commentary_section_id").references(
			() => commentarySections.id,
			{
				onDelete: "restrict",
			},
		),
	},
	(table) => [
		check(
			"content_revisions_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		check(
			"content_revisions_exactly_one_target_check",
			sql`num_nonnulls(
				${table.bookIntroductionSectionId},
					${table.commentaryPassageId},
					${table.commentarySectionId}
				) = 1`,
		),

		check(
			"content_revisions_snapshot_shape_check",
			sql`
				(
					${table.commentaryPassageId} IS NOT NULL
					AND ${table.title} IS NULL
					AND ${table.position} IS NULL
				)
				OR (
					(${table.bookIntroductionSectionId} IS NOT NULL OR ${table.commentarySectionId} IS NOT NULL)
					AND ${table.title} IS NOT NULL
					AND btrim(${table.title}) <> ''
					AND ${table.position} IS NOT NULL
					AND ${table.position} > 0
				)
			`,
		),

		unique("content_revisions_id_book_intro_section_unique").on(
			table.id,
			table.bookIntroductionSectionId,
		),

		unique("content_revisions_id_commentary_unique").on(
			table.id,
			table.commentaryPassageId,
		),

		unique("content_revisions_id_commentary_section_unique").on(
			table.id,
			table.commentarySectionId,
		),

		index("content_revisions_book_intro_section_idx")
			.on(table.bookIntroductionSectionId, table.createdAt)
			.where(sql`${table.bookIntroductionSectionId} IS NOT NULL`),

		index("content_revisions_commentary_idx")
			.on(table.commentaryPassageId, table.createdAt)
			.where(sql`${table.commentaryPassageId} IS NOT NULL`),

		index("content_revisions_commentary_section_idx")
			.on(table.commentarySectionId, table.createdAt)
			.where(sql`${table.commentarySectionId} IS NOT NULL`),

		index("content_revisions_created_by_created_at_idx").on(
			table.createdByUserId,
			table.createdAt,
		),
	],
);

export const contentRevisionsRelations = relations(
	contentRevisions,
	({ one, many }) => ({
		bookIntroductionSection: one(bookIntroductionSections, {
			fields: [contentRevisions.bookIntroductionSectionId],
			references: [bookIntroductionSections.id],
			relationName: "bookIntroductionSectionRevisions",
		}),
		commentary: one(commentaries, {
			fields: [contentRevisions.commentaryPassageId],
			references: [commentaries.passageId],
			relationName: "commentaryRevisions",
		}),
		commentarySection: one(commentarySections, {
			fields: [contentRevisions.commentarySectionId],
			references: [commentarySections.id],
			relationName: "commentarySectionRevisions",
		}),
		citations: many(citations),
	}),
);
