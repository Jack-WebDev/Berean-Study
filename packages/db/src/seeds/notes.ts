import { notePassages } from "../schema/note_passages";
import { notes } from "../schema/notes";
import {
	createdAt,
	db,
	numberId,
	richTextContent,
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
				title: sentence(),
				status: "saved" as const,
				content: richTextContent(sentence()),
				createdAt: createdAt(),
				updatedAt: createdAt(),
			})),
		)
		.returning({ id: notes.id });
	await db.insert(notePassages).values(
		inserted.map(({ id }, i) => ({
			noteId: id,
			passageId: numberId(context, "passages", i),
			position: 0,
		})),
	);
	save(
		context,
		"notes",
		inserted.map(({ id }) => id),
	);
	return;
}
