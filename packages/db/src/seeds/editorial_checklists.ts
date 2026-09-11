import { editorialChecklists } from "../schema/editorial_checklists";
import { db, rows, type SeedContext, save } from "./utils";
export async function seedEditorialChecklists(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(editorialChecklists)
		.values(
			rows(count, (index) => ({
				requirement: `Seed editorial requirement ${index + 1}`,
				position: index + 1,
			})),
		)
		.returning({ id: editorialChecklists.id });
	save(
		context,
		"editorialChecklists",
		inserted.map(({ id }) => id),
	);
	return;
}
