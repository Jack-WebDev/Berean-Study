import { researchNotes } from "../schema/research_notes";
import { db, numberId, rows, type SeedContext, save, sentence } from "./utils";
export async function seedResearchNotes(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(researchNotes)
		.values(
			rows(count, (i) =>
				i % 2 === 0
					? { bookId: numberId(context, "books", i), content: sentence() }
					: {
							passageId: numberId(context, "passages", i),
							content: sentence(),
						},
			),
		)
		.returning({ id: researchNotes.id });
	save(
		context,
		"researchNotes",
		inserted.map(({ id }) => id),
	);
	return;
}
