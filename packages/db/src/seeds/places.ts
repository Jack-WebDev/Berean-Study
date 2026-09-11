import { places } from "../schema/places";
import { db, faker, rows, type SeedContext, save } from "./utils";
export async function seedPlaces(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(places)
		.values(
			rows(count, (index) => ({
				name: `${faker.location.city()} ${index + 1}`,
			})),
		)
		.returning({ id: places.id });
	save(
		context,
		"places",
		inserted.map(({ id }) => id),
	);
	return;
}
