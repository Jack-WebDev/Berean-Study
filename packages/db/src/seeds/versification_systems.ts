import { versificationSystems } from "../schema/versification_systems";
import { db, faker, rows, type SeedContext, save } from "./utils";
export async function seedVersificationSystems(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(versificationSystems)
		.values(
			rows(count, (index) => ({
				name: `Seed Versification ${index + 1}`,
				slug: `seed-versification-${index + 1}-${faker.string.alphanumeric(5).toLowerCase()}`,
			})),
		)
		.returning({ id: versificationSystems.id });
	save(
		context,
		"versificationSystems",
		inserted.map(({ id }) => id),
	);
	return;
}
