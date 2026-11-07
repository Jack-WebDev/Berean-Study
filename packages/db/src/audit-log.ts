import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { type AuditDomain, editorialAuditDomains } from "./audit-catalogue";
import type { DbExecutor } from "./db-executor";
import { auditLog } from "./schema/audit_log";
import { user } from "./schema/auth";

const AUDIT_PAGE_SIZE = 25;

export type AuditViewer = { canViewAll: boolean; userId: string };

export type AuditFilter = { domain?: AuditDomain; mine?: boolean };

function visibleEntries(viewer: AuditViewer, filter: AuditFilter) {
	return and(
		viewer.canViewAll
			? undefined
			: or(
					inArray(auditLog.domain, [...editorialAuditDomains]),
					eq(auditLog.actorUserId, viewer.userId),
				),
		filter.domain ? eq(auditLog.domain, filter.domain) : undefined,
		filter.mine ? eq(auditLog.actorUserId, viewer.userId) : undefined,
	);
}

export type AuditDetails = {
	decision?: string;
	/** Readable name of what changed, when it isn't a person. */
	name?: string;
	note?: string;
	permission?: string;
	reason?: string;
	role?: string;
	/** The Community rule a moderation decision relied on. */
	rule?: string;
};

/** The parts of an entry's stored details that people read. The rest stays in the export. */
export function readAuditDetails(details: unknown): AuditDetails {
	if (typeof details !== "object" || details === null) return {};
	const read: AuditDetails = {};
	for (const key of [
		"decision",
		"name",
		"note",
		"permission",
		"reason",
		"role",
		"rule",
	] as const) {
		const value = (details as Record<string, unknown>)[key];
		if (typeof value === "string") read[key] = value;
	}
	return read;
}

const targetUser = alias(user, "target_user");

function entriesQuery(
	client: DbExecutor,
	where: ReturnType<typeof visibleEntries>,
) {
	return client
		.select({
			id: auditLog.id,
			occurredAt: auditLog.occurredAt,
			actorUserId: auditLog.actorUserId,
			actorName: user.name,
			actorRole: auditLog.actorRole,
			action: auditLog.action,
			domain: auditLog.domain,
			targetType: auditLog.targetType,
			targetId: auditLog.targetId,
			targetName: targetUser.name,
			details: auditLog.details,
		})
		.from(auditLog)
		.innerJoin(user, eq(user.id, auditLog.actorUserId))
		.leftJoin(
			targetUser,
			and(
				eq(auditLog.targetType, "user"),
				eq(targetUser.id, auditLog.targetId),
			),
		)
		.where(where)
		.orderBy(desc(auditLog.occurredAt), desc(auditLog.id));
}

/** One page of the audit log. Names are read live, so deleted accounts show "Deleted member". */
export async function listAuditEntries(
	client: DbExecutor,
	viewer: AuditViewer,
	filter: AuditFilter & { page: number },
) {
	const where = visibleEntries(viewer, filter);
	const [totals] = await client
		.select({ value: sql<number>`count(*)::int` })
		.from(auditLog)
		.where(where);
	const entries = await entriesQuery(client, where)
		.limit(AUDIT_PAGE_SIZE)
		.offset((filter.page - 1) * AUDIT_PAGE_SIZE);

	return {
		entries: entries.map((entry) => ({
			...entry,
			details: readAuditDetails(entry.details),
		})),
		pageSize: AUDIT_PAGE_SIZE,
		total: totals?.value ?? 0,
	};
}

/** The latest entries this person may see, for a short feed. */
export async function listRecentAuditEntries(
	client: DbExecutor,
	viewer: AuditViewer,
	limit: number,
) {
	const entries = await entriesQuery(client, visibleEntries(viewer, {})).limit(
		limit,
	);
	return entries.map((entry) => ({
		...entry,
		details: readAuditDetails(entry.details),
	}));
}

/** A cell that a spreadsheet can't mistake for a formula, since reasons are free text. */
function csvCell(value: string) {
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return `"${safe.replaceAll('"', '""')}"`;
}

/** Everything the current filter matches, as CSV. */
export async function exportAuditEntries(
	client: DbExecutor,
	viewer: AuditViewer,
	filter: AuditFilter,
) {
	const entries = await entriesQuery(client, visibleEntries(viewer, filter));
	const header = [
		"When",
		"Actor",
		"Actor role",
		"Action",
		"Area",
		"Target type",
		"Target",
		"Details",
	];
	const rows = entries.map((entry) => [
		entry.occurredAt.toISOString(),
		entry.actorName,
		entry.actorRole ?? "",
		entry.action,
		entry.domain,
		entry.targetType,
		entry.targetName ?? entry.targetId,
		entry.details ? JSON.stringify(entry.details) : "",
	]);

	return [header, ...rows]
		.map((row) => row.map(csvCell).join(","))
		.join("\r\n");
}
