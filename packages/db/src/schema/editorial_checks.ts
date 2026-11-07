import { sql } from "drizzle-orm";
import {
	check,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import type { EditorialCheckResult } from "../content-kinds";
import { user } from "./auth";
import { contentRevisions } from "./content_revisions";
import { editorialChecklists } from "./editorial_checklists";

export const editorialChecks = pgTable(
	"editorial_checks",
	{
		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, {
				onDelete: "restrict",
			}),

		editorialChecklistId: integer("editorial_checklist_id")
			.notNull()
			.references(() => editorialChecklists.id, {
				onDelete: "restrict",
			}),

		checkedByUserId: text("checked_by_user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "restrict",
			}),

		result: text("result").$type<EditorialCheckResult>().notNull(),

		note: text("note"),

		checkedAt: timestamp("checked_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.contentRevisionId, table.editorialChecklistId],
		}),

		check(
			"editorial_checks_result_check",
			sql`${table.result} IN ('passed', 'failed', 'not_applicable')`,
		),
	],
);
