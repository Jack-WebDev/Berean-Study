import { testimonyPassages } from "../schema/testimony_passages";
import { db, numberId, rows, type SeedContext } from "./utils";

export async function seedTestimonyPassages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(testimonyPassages).values(
		rows(count, (i) => ({
			testimonyId: numberId(context, "testimonies", i),
			passageId: numberId(context, "passages", i),
		})),
	);
}
