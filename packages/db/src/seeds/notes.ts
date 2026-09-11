import { notes } from "../schema/notes";
import {
	createdAt,
	db,
	numberId,
	rows,
	type SeedContext,
	save,
	sentence,
	textId,
} from "./utils";
export async function seedNotes(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(notes)
		.values(
			rows(count, (i) => ({
				userId: textId(context, "users", i),
				passageId: numberId(context, "passages", i),
				content: sentence(),
				createdAt: createdAt(),
				updatedAt: createdAt(),
			})),
		)
		.returning({ id: notes.id });
	save(
		context,
		"notes",
		inserted.map(({ id }) => id),
	);
	return;
}
