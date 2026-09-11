import { verses } from "../schema/verses";
import { db, numberId, rows, type SeedContext, save } from "./utils";
export async function seedVerses(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(verses)
		.values(
			rows(count, (i) => ({
				chapterId: numberId(context, "chapters", i),
				number: i + 1,
			})),
		)
		.returning({ id: verses.id });
	save(
		context,
		"verses",
		inserted.map(({ id }) => id),
	);
	return;
}
