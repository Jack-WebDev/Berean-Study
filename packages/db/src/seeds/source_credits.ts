import { sourceCredits } from "../schema/source_credits";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedSourceCredits(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(sourceCredits).values(
		rows(count, (i) => ({
			sourceId: numberId(context, "sources", i),
			creditedPersonId: numberId(context, "creditedPeople", i),
			role: "author",
			position: i + 1,
		})),
	);
	return;
}
