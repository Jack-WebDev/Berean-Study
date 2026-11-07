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

/** Without full access, people see these areas plus their own actions. */
export const editorialAuditDomains = [
	"editorial",
	"publication",
] as const satisfies readonly AuditDomain[];

const auditActionDomains = {
	"revision.submitted": "editorial",
	"revision.approved": "editorial",
	"revision.changes_requested": "editorial",
	"revision.published": "publication",
	"revision.withdrawn": "publication",
	"verse_text.entered": "scripture",
	"verse_text.proofread": "scripture",
	"verse_text.sent_back": "scripture",
	"verse_text.reopened": "scripture",
	"verse_text.published": "publication",
	"verse_text.corrected": "scripture",
	"chapter.added": "scripture",
	"chapter.removed": "scripture",
	"verse.added": "scripture",
	"verse.removed": "scripture",
	"structure_change.proposed": "scripture",
	"structure_change.confirmed": "scripture",
	"structure_change.returned": "scripture",
	"structure_change.rejected": "scripture",
	"canon_change.proposed": "scripture",
	"canon_change.confirmed": "scripture",
	"canon_change.returned": "scripture",
	"canon_change.rejected": "scripture",
	"translation.details_changed": "scripture",
	"translation.permission_recorded": "scripture",
	"translation.permission_removed": "scripture",
	"book.record_changed": "scripture",
	"role.created": "authorization",
	"role_permission.added": "authorization",
	"role_permission.removed": "authorization",
	"role_permission.proposed": "authorization",
	"role_permission.decided": "authorization",
	"role.granted": "authorization",
	"role.revoked": "authorization",
	"promotion.requested": "authorization",
	"promotion.decided": "authorization",
	"access_case.opened": "authorization",
	"access_case.approved": "authorization",
	"access_case.declined": "authorization",
	"community_post.removed": "community",
	"community_post.restored": "community",
	"user.warned": "community",
	"user.restricted": "community",
	"user.suspended": "users",
	"user.suspension_lifted": "users",
	"user.account_retired": "users",
	"source.merged": "editorial",
	"source.retired": "editorial",
} as const satisfies Record<string, AuditDomain>;

export type AuditAction = keyof typeof auditActionDomains;

export const auditDomainLabels: Record<AuditDomain, string> = {
	editorial: "Editorial",
	publication: "Publication",
	scripture: "Scripture data",
	authorization: "Authorization",
	community: "Community",
	users: "Users",
};

/** What readers of the audit log see for each action. */
export const auditActionLabels: Record<AuditAction, string> = {
	"revision.submitted": "Submitted a revision",
	"revision.approved": "Approved a revision",
	"revision.changes_requested": "Requested changes to a revision",
	"revision.published": "Published a revision",
	"revision.withdrawn": "Withdrew a revision",
	"verse_text.entered": "Sent verse text for proofreading",
	"verse_text.proofread": "Proofread verse text",
	"verse_text.sent_back": "Sent verse text back",
	"verse_text.reopened": "Sent passed verse text back to proofreading",
	"verse_text.published": "Published verse text",
	"verse_text.corrected": "Corrected verse text",
	"chapter.added": "Added a chapter",
	"chapter.removed": "Removed an empty chapter",
	"verse.added": "Added verses",
	"verse.removed": "Removed an empty verse",
	"structure_change.proposed": "Proposed a structure change",
	"structure_change.confirmed": "Confirmed a structure change",
	"structure_change.returned": "Sent a structure change back",
	"structure_change.rejected": "Rejected a structure change",
	"canon_change.proposed": "Proposed a canon change",
	"canon_change.confirmed": "Confirmed a canon change",
	"canon_change.returned": "Sent a canon change back",
	"canon_change.rejected": "Rejected a canon change",
	"translation.details_changed": "Changed translation details",
	"translation.permission_recorded": "Recorded translation permission",
	"translation.permission_removed": "Removed translation permission",
	"book.record_changed": "Changed a book record",
	"role.created": "Created a role",
	"role_permission.added": "Added a permission to a role",
	"role_permission.removed": "Removed a permission from a role",
	"role_permission.proposed": "Proposed a permission for a role",
	"role_permission.decided": "Decided a role permission change",
	"role.granted": "Granted a role",
	"role.revoked": "Removed a role",
	"promotion.requested": "Requested a role change",
	"promotion.decided": "Decided a role change",
	"access_case.opened": "Opened an access case",
	"access_case.approved": "Approved an access case",
	"access_case.declined": "Declined an access case",
	"community_post.removed": "Removed a Community post",
	"community_post.restored": "Restored a Community post",
	"user.warned": "Warned a member",
	"user.restricted": "Restricted a member",
	"user.suspended": "Suspended an account",
	"user.suspension_lifted": "Lifted a suspension",
	"user.account_retired": "Deleted their account",
	"source.merged": "Merged sources",
	"source.retired": "Retired a source",
};

export function isAuditAction(value: string): value is AuditAction {
	return value in auditActionLabels;
}

export function auditDomainFor(action: AuditAction): AuditDomain {
	return auditActionDomains[action];
}
