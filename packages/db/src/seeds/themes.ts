import { themes } from "../schema/themes";
import { db, faker, rows, type SeedContext, save } from "./utils";
export async function seedThemes(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(themes)
		.values(
			rows(count, (index) => ({
				name: `Seed Theme ${index + 1}`,
				slug: `seed-theme-${index + 1}-${faker.string.alphanumeric(5).toLowerCase()}`,
			})),
		)
		.returning({ id: themes.id });
	save(
		context,
		"themes",
		inserted.map(({ id }) => id),
	);
	return;
}
