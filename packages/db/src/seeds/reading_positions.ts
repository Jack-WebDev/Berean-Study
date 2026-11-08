import { readingPositions } from "../schema/reading_positions";
import { db, numberId, rows, type SeedContext, textId } from "./utils";
export async function seedReadingPositions(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(readingPositions).values(
		rows(count, (i) => ({
			userId: textId(context, "users", i),
			bookId: numberId(context, "books", i),
			chapter: 1,
			verse: (i % 20) + 1,
		})),
	);
	return;
}
