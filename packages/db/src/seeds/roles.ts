import { roles } from "../schema/roles";
import { db, type SeedContext, save } from "./utils";

const roleDefinitions = [
	{
		name: "Member",
		description: "A registered user with access to member features.",
		autoAssign: true,
	},
	{
		name: "Contributor",
		description: "A member who can contribute study content and research.",
		autoAssign: false,
	},
	{
		name: "Admin",
		description: "A user who can review, publish, and manage study content.",
		autoAssign: false,
	},
	{
		name: "SuperAdmin",
		description: "A user with unrestricted platform and access administration.",
		autoAssign: false,
	},
];

export async function seedRoles(context: SeedContext): Promise<void> {
	const inserted = await db
		.insert(roles)
		.values(roleDefinitions)
		.returning({ id: roles.id });

	save(
		context,
		"roles",
		inserted.map(({ id }) => id),
	);
}
