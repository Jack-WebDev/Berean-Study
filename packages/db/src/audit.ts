import { getPrimaryRole } from "./access";
import { type AuditAction, auditDomainFor } from "./audit-catalogue";
import type { DbExecutor } from "./db-executor";
import { auditLog } from "./schema/audit_log";

/**
 * Adds one entry to the audit log.
 *
 * Pass the transaction that makes the change, so the change and its record
 * succeed or fail together. The area of the app comes from the action, and the
 * actor's role is captured now because it may have changed by the time anyone
 * reads the entry.
 */
export async function recordAudit(
	client: DbExecutor,
	event: {
		actorUserId: string;
		action: AuditAction;
		targetType: string;
		targetId: number | string;
		details?: Record<string, unknown>;
	},
) {
	const actorRole = await getPrimaryRole(client, event.actorUserId);

	await client.insert(auditLog).values({
		actorUserId: event.actorUserId,
		actorRole: actorRole?.name ?? null,
		action: event.action,
		domain: auditDomainFor(event.action),
		targetType: event.targetType,
		targetId: String(event.targetId),
		details: event.details,
	});
}
