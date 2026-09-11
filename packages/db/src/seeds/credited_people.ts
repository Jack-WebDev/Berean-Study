import { creditedPeople } from "../schema/credited_people";
import { db, faker, rows, type SeedContext, save } from "./utils";
export async function seedCreditedPeople(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(creditedPeople)
		.values(
			rows(count, (index) => ({
				name: `${faker.person.fullName()} ${index + 1}`,
			})),
		)
		.returning({ id: creditedPeople.id });
	save(
		context,
		"creditedPeople",
		inserted.map(({ id }) => id),
	);
	return;
}
