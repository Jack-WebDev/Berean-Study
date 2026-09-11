import { personAliases } from "../schema/person_aliases";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedPersonAliases(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(personAliases).values(
		rows(count, (i) => ({
			personId: numberId(context, "biblicalPeople", i),
			alias: `Seed Person Alias ${i + 1}`,
		})),
	);
	return;
}
