import { userRoles } from "../schema/user_roles";
import { db, numberId, rows, type SeedContext, textId } from "./utils";

// Positions in roleCatalogue.
const MEMBER = 0;
const CONTRIBUTOR = 1;
const GREEK_REVIEWER = 2;
const ADMIN = 3;
const SUPERADMIN = 4;

export async function seedUserRoles(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const assignments = rows(count, (index) => ({
		userId: textId(context, "users", index),
		roleId: numberId(context, "roles", MEMBER),
	}));

	// One person in each staff role, and two Superadmins so two-person changes
	// can be tried out.
	for (const [userIndex, roleIndex] of [
		[0, CONTRIBUTOR],
		[1, ADMIN],
		[2, SUPERADMIN],
		[3, SUPERADMIN],
		[4, GREEK_REVIEWER],
	] as const) {
		assignments.push({
			userId: textId(context, "users", userIndex),
			roleId: numberId(context, "roles", roleIndex),
		});
	}

	await db.insert(userRoles).values(assignments).onConflictDoNothing();
}
