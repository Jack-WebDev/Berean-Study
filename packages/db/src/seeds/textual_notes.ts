import { textualNotes } from "../schema/textual_notes";
import { db, numberId, rows, type SeedContext, save, sentence } from "./utils";
export async function seedTextualNotes(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(textualNotes)
		.values(
			rows(count, (i) => ({
				passageId: numberId(context, "passages", i),
				content: sentence(),
				position: i + 1,
			})),
		)
		.returning({ id: textualNotes.id });
	save(
		context,
		"textualNotes",
		inserted.map(({ id }) => id),
	);
	return;
}
