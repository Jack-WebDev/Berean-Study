import { permissions } from "../schema/permissions";
import { db, type SeedContext, save } from "./utils";

const permissionDefinitions = [
	{
		key: "content.read",
		name: "Read content",
		category: "content",
		description: "View published study content.",
	},
	{
		key: "content.create",
		name: "Create content",
		category: "content",
		description: "Create commentary and other study content.",
	},
	{
		key: "content.update",
		name: "Update content",
		category: "content",
		description: "Update working study content.",
	},
	{
		key: "content.review",
		name: "Review content",
		category: "content",
		description: "Review content revisions and editorial checks.",
	},
	{
		key: "content.publish",
		name: "Publish content",
		category: "content",
		description: "Publish, correct, and withdraw content.",
	},
	{
		key: "research.create",
		name: "Create research",
		category: "research",
		description: "Create research notes and source links.",
	},
	{
		key: "research.update",
		name: "Update research",
		category: "research",
		description: "Update research notes and source links.",
	},
	{
		key: "research.manage",
		name: "Manage research",
		category: "research",
		description: "Manage shared research records and sources.",
	},
	{
		key: "issues.create",
		name: "Report issues",
		category: "issues",
		description: "Report issues with published content.",
	},
	{
		key: "issues.manage",
		name: "Manage issues",
		category: "issues",
		description: "Resolve and dismiss content issues.",
	},
	{
		key: "access.manage",
		name: "Manage access",
		category: "access",
		description: "Manage user roles and permissions.",
	},
	{
		key: "audit.read",
		name: "Read audit log",
		category: "access",
		description: "View audit history.",
	},
];

export async function seedPermissions(context: SeedContext): Promise<void> {
	const inserted = await db
		.insert(permissions)
		.values(permissionDefinitions)
		.returning({ id: permissions.id });

	save(
		context,
		"permissions",
		inserted.map(({ id }) => id),
	);
}
