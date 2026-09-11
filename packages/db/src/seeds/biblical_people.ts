import { biblicalPeople } from "../schema/biblical_people";
import { db, faker, rows, type SeedContext, save } from "./utils";
export async function seedBiblicalPeople(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(biblicalPeople)
		.values(
			rows(count, (index) => ({
				name: `${faker.person.fullName()} ${index + 1}`,
			})),
		)
		.returning({ id: biblicalPeople.id });
	save(
		context,
		"biblicalPeople",
		inserted.map(({ id }) => id),
	);
	return;
}
