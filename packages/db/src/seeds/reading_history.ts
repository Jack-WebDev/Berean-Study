import { readingHistory } from "../schema/reading_history";
import {
	createdAt,
	db,
	numberId,
	rows,
	type SeedContext,
	save,
	textId,
} from "./utils";
export async function seedReadingHistory(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(readingHistory)
		.values(
			rows(count, (i) => ({
				userId: textId(context, "users", i),
				passageId: numberId(context, "passages", i),
				visitedAt: createdAt(),
			})),
		)
		.returning({ id: readingHistory.id });
	save(
		context,
		"readingHistory",
		inserted.map(({ id }) => id),
	);
	return;
}
