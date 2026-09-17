import { testimonyNotes } from "../schema/testimony_notes";
import { db, numberId, rows, type SeedContext, textId } from "./utils";

export async function seedTestimonyNotes(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(testimonyNotes).values(
		rows(count, (i) => ({
			testimonyId: numberId(context, "testimonies", i),
			noteId: numberId(context, "notes", i),
			userId: textId(context, "users", i),
		})),
	);
}
