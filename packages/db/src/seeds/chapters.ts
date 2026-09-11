import { chapters } from "../schema/chapters";
import { db, numberId, rows, type SeedContext, save } from "./utils";
export async function seedChapters(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(chapters)
		.values(
			rows(count, (i) => ({
				bookId: numberId(context, "books", i),
				versificationSystemId: numberId(context, "versificationSystems", i),
				number: i + 1,
			})),
		)
		.returning({ id: chapters.id });
	save(
		context,
		"chapters",
		inserted.map(({ id }) => id),
	);
	return;
}
