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
import { contentRevisions } from "./content_revisions";

export const editorialAssignments = pgTable(
	"editorial_assignments",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, {
				onDelete: "restrict",
			}),

		assigneeUserId: text("assignee_user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "restrict",
			}),

		/** Writers take over a draft. Reviewers are asked to pick up a submitted revision. */
		role: text().$type<"reviewer" | "writer">().notNull().default("reviewer"),

		assignedByUserId: text("assigned_by_user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "restrict",
			}),

		assignedAt: timestamp("assigned_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		unique("editorial_assignments_revision_assignee_unique").on(
			table.contentRevisionId,
			table.assigneeUserId,
		),

		check(
			"editorial_assignments_role_check",
			sql`${table.role} IN ('reviewer', 'writer')`,
		),

		index("editorial_assignments_assignee_assigned_at_idx").on(
			table.assigneeUserId,
			table.assignedAt,
		),
	],
);

export const editorialAssignmentsRelations = relations(
	editorialAssignments,
	({ one }) => ({
		contentRevision: one(contentRevisions, {
			fields: [editorialAssignments.contentRevisionId],
			references: [contentRevisions.id],
		}),

		assignee: one(user, {
			fields: [editorialAssignments.assigneeUserId],
			references: [user.id],
			relationName: "editorialAssignmentAssignee",
		}),

		assignedBy: one(user, {
			fields: [editorialAssignments.assignedByUserId],
			references: [user.id],
			relationName: "editorialAssignmentAssignedBy",
		}),
	}),
);
