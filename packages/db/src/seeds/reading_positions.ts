import { readingPositions } from "../schema/reading_positions";
import { db, numberId, rows, type SeedContext, textId } from "./utils";
export async function seedReadingPositions(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(readingPositions).values(
		rows(count, (i) => ({
			userId: textId(context, "users", i),
			passageId: numberId(context, "passages", i),
		})),
	);
	return;
}
