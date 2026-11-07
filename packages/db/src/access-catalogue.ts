/*
 * The permissions and starting roles Berean Study ships with.
 *
 * This file has no imports so the browser can use it too: the sidebar needs the
 * permission names, but must never pull in the database driver.
 */

export const permissionCatalogue = [
	{
		key: "study.read",
		name: "Read and study",
		category: "Reading & community",
		description: "Read Scripture and use the study tools.",
	},
	{
		key: "library.own",
		name: "Personal library",
		category: "Reading & community",
		description:
			"Use your own notes, prayers, collections and saved items. Nothing grants access to someone else's.",
	},
	{
		key: "community.post",
		name: "Post in Community",
		category: "Reading & community",
		description: "Share posts with the Community.",
	},
	{
		key: "issues.create",
		name: "Report content issues",
		category: "Reading & community",
		description: "Report a problem with published content.",
	},
	{
		key: "research.manage",
		name: "Manage research",
		category: "Research & sources",
		description: "Create and edit research notes.",
	},
	{
		key: "sources.manage",
		name: "Manage sources",
		category: "Research & sources",
		description: "Add and edit sources, excerpts, citations and claims.",
	},
	{
		key: "sources.merge",
		name: "Merge duplicate sources",
		category: "Research & sources",
		description: "Combine two records of the same source into one.",
	},
	{
		key: "sources.retire",
		name: "Retire sources",
		category: "Research & sources",
		description:
			"Stop a source being relied on. One already in use needs a second person.",
	},
	{
		key: "content.write",
		name: "Write content",
		category: "Content",
		description: "Draft new study content.",
	},
	{
		key: "content.revise",
		name: "Revise content",
		category: "Content",
		description: "Draft changes to existing study content.",
	},
	{
		key: "content.confirm_foundational",
		name: "Confirm foundational content changes",
		category: "Content",
		description:
			"Send, or give the second confirmation to, a stance change or a published theme rename or merge.",
	},
	{
		key: "content.original_language",
		name: "Write original-language content",
		category: "Content",
		description: "Draft original-language notes, textual notes and variants.",
	},
	{
		key: "scripture.enter",
		name: "Enter Scripture text",
		category: "Scripture text",
		description:
			"Type or paste verses, and add chapters and verses at the end.",
	},
	{
		key: "scripture.proofread",
		name: "Proofread Scripture text",
		category: "Scripture text",
		description: "Check verses that someone else entered.",
	},
	{
		key: "editorial.check",
		name: "Complete editorial checks",
		category: "Editorial",
		description: "Complete the checks a revision needs before review.",
	},
	{
		key: "editorial.check_original_language",
		name: "Check original-language content",
		category: "Editorial",
		description:
			"Give the extra check that original-language and textual content needs before it can be approved.",
	},
	{
		key: "editorial.review",
		name: "Review revisions",
		category: "Editorial",
		description: "Approve revisions, or send them back with requested changes.",
	},
	{
		key: "editorial.assign",
		name: "Assign editorial work",
		category: "Editorial",
		description: "Run the editorial queue and assign writers and reviewers.",
	},
	{
		key: "publication.publish",
		name: "Publish",
		category: "Publication",
		description: "Publish approved revisions and proofread chapters.",
	},
	{
		key: "publication.withdraw",
		name: "Withdraw",
		category: "Publication",
		description: "Take published content down.",
	},
	{
		key: "issues.manage",
		name: "Manage content issues",
		category: "Publication",
		description: "Resolve or dismiss reported content issues.",
	},
	{
		key: "community.moderate",
		name: "Moderate Community",
		category: "People",
		description: "Review reports and remove posts that break the guidelines.",
	},
	{
		key: "contributors.manage",
		name: "Manage contributors",
		category: "People",
		description: "Add and remove contributors, and request promotions.",
	},
	{
		key: "admins.manage",
		name: "Manage admins",
		category: "People",
		description: "Manage users and grant the Admin and Superadmin roles.",
	},
	{
		key: "roles.manage",
		name: "Manage roles",
		category: "People",
		description: "Create roles and change what each role can do.",
	},
	{
		key: "scripture.manage",
		name: "Manage Scripture structure",
		category: "Foundations",
		description: "Change books and their chapter and verse structure.",
	},
	{
		key: "canon.manage",
		name: "Manage canon",
		category: "Foundations",
		description:
			"Change the books in each canon, their order and their chapter limits.",
	},
	{
		key: "translations.manage",
		name: "Manage translations",
		category: "Foundations",
		description: "Edit translation details and record publishing permission.",
	},
	{
		key: "settings.manage",
		name: "Manage settings",
		category: "Foundations",
		description: "Change Berean Study's settings.",
	},
	{
		key: "audit.view",
		name: "View editorial activity",
		category: "Foundations",
		description: "See the editorial and publication parts of the audit log.",
	},
	{
		key: "audit.view_all",
		name: "View all activity",
		category: "Foundations",
		description: "See the whole audit log.",
	},
] as const;

export type PermissionKey = (typeof permissionCatalogue)[number]["key"];

const permissionKeys: ReadonlySet<string> = new Set(
	permissionCatalogue.map(({ key }) => key),
);

export function isPermissionKey(value: string): value is PermissionKey {
	return permissionKeys.has(value);
}

const memberGrants = [
	"study.read",
	"library.own",
	"community.post",
	"issues.create",
] as const satisfies readonly PermissionKey[];

const contributorGrants = [
	...memberGrants,
	"research.manage",
	"sources.manage",
	"content.write",
	"content.revise",
	"content.original_language",
	"scripture.enter",
	"scripture.proofread",
	"editorial.check",
	"editorial.review",
] as const satisfies readonly PermissionKey[];

const adminGrants = [
	...contributorGrants,
	"sources.merge",
	"editorial.assign",
	"publication.publish",
	"publication.withdraw",
	"issues.manage",
	"community.moderate",
	"contributors.manage",
	"audit.view",
] as const satisfies readonly PermissionKey[];

/**
 * Any role holding one of these is protected: granting or removing it needs a
 * second person. Deciding this from the permissions, not the role's name, means
 * a custom role can't be used to get around the rule.
 */
export const elevatedPermissions: ReadonlySet<PermissionKey> = new Set([
	"content.confirm_foundational",
	"sources.merge",
	"sources.retire",
	"editorial.assign",
	"publication.publish",
	"publication.withdraw",
	"issues.manage",
	"community.moderate",
	"contributors.manage",
	"admins.manage",
	"roles.manage",
	"scripture.manage",
	"canon.manage",
	"translations.manage",
	"settings.manage",
	"audit.view",
	"audit.view_all",
]);

export type RoleDefinition = {
	name: string;
	description: string;
	/** New accounts receive this role when they sign up. */
	autoAssign: boolean;
	/** The role always holds every permission and can't be edited, so nobody can lock the platform out of itself. */
	locked: boolean;
	grants: readonly PermissionKey[];
};

export const roleCatalogue: readonly RoleDefinition[] = [
	{
		name: "Member",
		description: "Reads, studies and takes part in the Community.",
		autoAssign: true,
		locked: false,
		grants: memberGrants,
	},
	{
		name: "Contributor",
		description:
			"Writes content, enters Scripture text and reviews others' work.",
		autoAssign: false,
		locked: false,
		grants: contributorGrants,
	},
	{
		name: "Greek Reviewer",
		description: "Reviews original-language and textual content.",
		autoAssign: false,
		locked: false,
		grants: [
			...memberGrants,
			"editorial.check",
			"editorial.check_original_language",
			"editorial.review",
		],
	},
	{
		name: "Admin",
		description: "Runs the editorial queue, publishes and moderates.",
		autoAssign: false,
		locked: false,
		grants: adminGrants,
	},
	{
		name: "Superadmin",
		description: "Governs Berean Study's foundations, people and permissions.",
		autoAssign: false,
		locked: true,
		grants: permissionCatalogue.map(({ key }) => key),
	},
];
