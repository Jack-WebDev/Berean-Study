import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

import { contentRevisions } from "./content_revisions";
import { contributors } from "./contributors";

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
			.references(() => contributors.userId, {
				onDelete: "restrict",
			}),

		assignedByUserId: text("assigned_by_user_id")
			.notNull()
			.references(() => contributors.userId, {
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

		assignee: one(contributors, {
			fields: [editorialAssignments.assigneeUserId],
			references: [contributors.userId],
			relationName: "editorialAssignmentAssignee",
		}),

		assignedBy: one(contributors, {
			fields: [editorialAssignments.assignedByUserId],
			references: [contributors.userId],
			relationName: "editorialAssignmentAssignedBy",
		}),
	}),
);
