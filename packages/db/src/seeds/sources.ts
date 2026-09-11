import { sources } from "../schema/sources";
import { db, faker, rows, type SeedContext, save } from "./utils";
export async function seedSources(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(sources)
		.values(
			rows(count, (index) => ({
				title: `Seed Source ${index + 1}: ${faker.lorem.words(3)}`,
				type: faker.helpers.arrayElement(["book", "article", "website"]),
				publicationYear: faker.number.int({ min: 1900, max: 2025 }),
			})),
		)
		.returning({ id: sources.id });
	save(
		context,
		"sources",
		inserted.map(({ id }) => id),
	);
	return;
}
