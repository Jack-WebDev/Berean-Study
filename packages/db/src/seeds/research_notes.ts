import { researchNotes } from "../schema/research_notes";
import {
	db,
	numberId,
	rows,
	type SeedContext,
	save,
	sentence,
	textId,
} from "./utils";

export async function seedResearchNotes(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(researchNotes)
		.values(
			rows(count, (i) => ({
				bookId: numberId(context, "books", i),
				content: sentence(),
				createdByUserId: textId(context, "users", i),
				reference: `Seed book ${i + 1}`,
			})),
		)
		.returning({ id: researchNotes.id });
	save(
		context,
		"researchNotes",
		inserted.map(({ id }) => id),
	);
}
