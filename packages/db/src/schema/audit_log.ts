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

import type { AuditDomain } from "../audit-catalogue";
import { user } from "./auth";

/**
 * Append-only: a database trigger rejects every update and delete, for everyone
 * including Superadmins.
 */
export const auditLog = pgTable(
	"audit_log",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		actorUserId: text("actor_user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "restrict",
			}),

		/**
		 * The actor's role at the time, because roles change and the log must
		 * still show what authority someone was acting under.
		 */
		actorRole: text("actor_role"),

		action: text().notNull(),

		domain: text().$type<AuditDomain>().notNull(),

		targetType: text("target_type").notNull(),

		targetId: text("target_id").notNull(),

		details: jsonb(),

		occurredAt: timestamp("occurred_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check(
			"audit_log_action_not_empty_check",
			sql`btrim(${table.action}) <> ''`,
		),

		check(
			"audit_log_target_type_not_empty_check",
			sql`btrim(${table.targetType}) <> ''`,
		),

		check(
			"audit_log_target_id_not_empty_check",
			sql`btrim(${table.targetId}) <> ''`,
		),

		check(
			"audit_log_domain_check",
			sql`${table.domain} IN (
				'editorial',
				'publication',
				'scripture',
				'authorization',
				'community',
				'users'
			)`,
		),

		check(
			"audit_log_actor_role_not_blank_check",
			sql`${table.actorRole} IS NULL OR btrim(${table.actorRole}) <> ''`,
		),

		check(
			"audit_log_details_object_check",
			sql`
				${table.details} IS NULL
				OR jsonb_typeof(${table.details}) = 'object'
			`,
		),

		index("audit_log_target_history_idx").on(
			table.targetType,
			table.targetId,
			table.occurredAt,
		),

		index("audit_log_actor_history_idx").on(
			table.actorUserId,
			table.occurredAt,
		),

		index("audit_log_occurred_at_idx").on(table.occurredAt),

		index("audit_log_domain_history_idx").on(table.domain, table.occurredAt),
	],
);
