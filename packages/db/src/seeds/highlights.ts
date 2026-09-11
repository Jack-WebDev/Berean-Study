import { highlights } from "../schema/highlights";
import { db, numberId, rows, type SeedContext, save, textId } from "./utils";
export async function seedHighlights(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(highlights)
		.values(
			rows(count, (i) => ({
				userId: textId(context, "users", i),
				translationId: numberId(context, "translations", i),
				verseId: numberId(context, "verses", i),
				startOffset: 0,
				endOffset: i + 1,
			})),
		)
		.returning({ id: highlights.id });
	save(
		context,
		"highlights",
		inserted.map(({ id }) => id),
	);
	return;
}
