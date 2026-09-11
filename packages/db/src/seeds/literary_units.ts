import { literaryUnits } from "../schema/literary_units";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedLiteraryUnits(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(literaryUnits).values(
		rows(count, (i) => ({
			passageId: numberId(context, "passages", i),
			parentPassageId:
				i % 2 === 0 ? undefined : numberId(context, "passages", i - 1),
		})),
	);
	return;
}
