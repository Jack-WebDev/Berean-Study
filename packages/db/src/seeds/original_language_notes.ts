import { originalLanguageNotes } from "../schema/original_language_notes";
import { db, numberId, rows, type SeedContext, save, sentence } from "./utils";
export async function seedOriginalLanguageNotes(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(originalLanguageNotes)
		.values(
			rows(count, (i) => ({
				passageId: numberId(context, "passages", i),
				content: sentence(),
				position: i + 1,
			})),
		)
		.returning({ id: originalLanguageNotes.id });
	save(
		context,
		"originalLanguageNotes",
		inserted.map(({ id }) => id),
	);
	return;
}
