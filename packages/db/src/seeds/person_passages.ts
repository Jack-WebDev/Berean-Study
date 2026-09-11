import { personPassages } from "../schema/person_passages";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedPersonPassages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(personPassages).values(
		rows(count, (i) => ({
			personId: numberId(context, "biblicalPeople", i),
			passageId: numberId(context, "passages", i),
		})),
	);
	return;
}
