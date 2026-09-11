import { canonTraditions } from "../schema/canon_traditions";
import { db, faker, rows, type SeedContext, save } from "./utils";
export async function seedCanonTraditions(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(canonTraditions)
		.values(
			rows(count, (index) => ({
				name: `Seed Canon ${index + 1}`,
				slug: `seed-canon-${index + 1}-${faker.string.alphanumeric(5).toLowerCase()}`,
			})),
		)
		.returning({ id: canonTraditions.id });
	save(
		context,
		"canonTraditions",
		inserted.map(({ id }) => id),
	);
	return;
}
