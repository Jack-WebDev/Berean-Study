/*
 * Every action the audit log records, and the area of Berean Study it belongs
 * to. This file has no imports so the audit log screen can use it in the browser.
 */

export const auditDomains = [
	"editorial",
	"publication",
	"scripture",
	"authorization",
	"community",
	"users",
] as const;

export type AuditDomain = (typeof auditDomains)[number];

const auditActionDomains = {
	"revision.submitted": "editorial",
	"revision.approved": "editorial",
	"revision.changes_requested": "editorial",
	"revision.published": "publication",
	"revision.withdrawn": "publication",
	"verse_text.entered": "scripture",
	"verse_text.proofread": "scripture",
	"verse_text.sent_back": "scripture",
	"verse_text.published": "publication",
	"verse_text.corrected": "scripture",
	"structure_change.proposed": "scripture",
	"structure_change.confirmed": "scripture",
	"structure_change.rejected": "scripture",
	"canon_change.proposed": "scripture",
	"canon_change.confirmed": "scripture",
	"translation.details_changed": "scripture",
	"translation.permission_recorded": "scripture",
	"role_permission.added": "authorization",
	"role_permission.removed": "authorization",
	"role.granted": "authorization",
	"role.revoked": "authorization",
	"promotion.requested": "authorization",
	"promotion.decided": "authorization",
	"access_case.opened": "authorization",
	"access_case.approved": "authorization",
	"community_post.removed": "community",
	"community_post.restored": "community",
	"user.warned": "community",
	"user.restricted": "community",
	"user.suspended": "users",
	"source.merged": "editorial",
	"source.retired": "editorial",
} as const satisfies Record<string, AuditDomain>;

export type AuditAction = keyof typeof auditActionDomains;

export function auditDomainFor(action: AuditAction): AuditDomain {
	return auditActionDomains[action];
}
