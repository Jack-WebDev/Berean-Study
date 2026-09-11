import { textualVariants } from "../schema/textual_variants";
import { db, numberId, rows, type SeedContext, save } from "./utils";
export async function seedTextualVariants(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(textualVariants)
		.values(
			rows(count, (i) => ({
				textualNoteId: numberId(context, "textualNotes", i),
				reading: `reading-${i + 1}`,
				position: i + 1,
			})),
		)
		.returning({ id: textualVariants.id });
	save(
		context,
		"textualVariants",
		inserted.map(({ id }) => id),
	);
	return;
}
