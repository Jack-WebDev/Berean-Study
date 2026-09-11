import { passages } from "../schema/passages";
import { db, numberId, rows, type SeedContext, save } from "./utils";
export async function seedPassages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(passages)
		.values(
			rows(count, (i) => ({
				bookId: numberId(context, "books", i),
				title: `Seed Passage ${i + 1}`,
			})),
		)
		.returning({ id: passages.id });
	save(
		context,
		"passages",
		inserted.map(({ id }) => id),
	);
	return;
}
