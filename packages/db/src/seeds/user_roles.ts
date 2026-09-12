import { userRoles } from "../schema/user_roles";
import { db, numberId, rows, type SeedContext, textId } from "./utils";

export async function seedUserRoles(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const assignments = rows(count, (index) => ({
		userId: textId(context, "users", index),
		roleId: numberId(context, "roles", 0),
	}));

	for (const [userIndex, roleIndex] of [
		[0, 1],
		[1, 2],
		[2, 3],
	] as const) {
		assignments.push({
			userId: textId(context, "users", userIndex),
			roleId: numberId(context, "roles", roleIndex),
		});
	}

	await db.insert(userRoles).values(assignments);
}
