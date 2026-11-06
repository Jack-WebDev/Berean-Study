import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Foundational changes that one person proposes and a different person decides.
 *
 * Confirming applies the change in the same transaction, so "applied" also means
 * "confirmed". The check below refuses self-approval even if application code
 * ever gets it wrong.
 */
export const changeProposals = pgTable(
	"change_proposals",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		kind: text().notNull(),

		payload: jsonb().$type<Record<string, unknown>>().notNull(),

		/** What the change affects, so a record's page can list its proposals. */
		targetType: text("target_type").notNull(),

		targetId: text("target_id").notNull(),

		reason: text().notNull(),

		proposerUserId: text("proposer_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		status: text()
			.$type<"proposed" | "applied" | "returned" | "rejected">()
			.notNull()
			.default("proposed"),

		decidedByUserId: text("decided_by_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),

		decisionNote: text("decision_note"),

		decidedAt: timestamp("decided_at", { withTimezone: true }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		check(
			"change_proposals_status_check",
			sql`${table.status} IN ('proposed', 'applied', 'returned', 'rejected')`,
		),

		check(
			"change_proposals_reason_not_blank_check",
			sql`btrim(${table.reason}) <> ''`,
		),

		check(
			"change_proposals_decider_not_proposer_check",
			sql`${table.decidedByUserId} <> ${table.proposerUserId}`,
		),

		check(
			"change_proposals_decision_state_check",
			sql`
				(
					${table.status} = 'proposed'
					AND ${table.decidedByUserId} IS NULL
					AND ${table.decisionNote} IS NULL
					AND ${table.decidedAt} IS NULL
				)
				OR
				(
					${table.status} <> 'proposed'
					AND ${table.decidedByUserId} IS NOT NULL
					AND btrim(${table.decisionNote}) <> ''
					AND ${table.decidedAt} IS NOT NULL
				)
			`,
		),

		index("change_proposals_status_created_at_idx").on(
			table.status,
			table.createdAt,
		),

		index("change_proposals_target_idx").on(table.targetType, table.targetId),
	],
);
