import { manuscripts } from "../schema/manuscripts";
import { db, faker, rows, type SeedContext, save } from "./utils";
export async function seedManuscripts(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(manuscripts)
		.values(
			rows(count, (index) => ({
				siglum: `S${index + 1}-${faker.string.alphanumeric(5).toUpperCase()}`,
				name: `Seed Manuscript ${index + 1}`,
			})),
		)
		.returning({ id: manuscripts.id });
	save(
		context,
		"manuscripts",
		inserted.map(({ id }) => id),
	);
	return;
}
