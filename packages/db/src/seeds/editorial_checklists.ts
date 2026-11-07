import { applyAccessCatalogue } from "../access-setup";
import { editorialChecklists } from "../schema/editorial_checklists";
import { db, type SeedContext, save } from "./utils";

/** The real checks, since the review screen shows them as they are. */
export async function seedEditorialChecklists(
	context: SeedContext,
): Promise<void> {
	await applyAccessCatalogue(db);
	const inserted = await db
		.select({ id: editorialChecklists.id })
		.from(editorialChecklists);
	save(
		context,
		"editorialChecklists",
		inserted.map(({ id }) => id),
	);
}
