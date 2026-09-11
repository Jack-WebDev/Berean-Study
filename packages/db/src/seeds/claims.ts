import { claims } from "../schema/claims";
import { db, faker, rows, type SeedContext, save, sentence } from "./utils";
export async function seedClaims(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(claims)
		.values(
			rows(count, () => ({
				statement: sentence(),
				status: faker.helpers.arrayElement([
					"unverified",
					"verified",
					"rejected",
				]),
			})),
		)
		.returning({ id: claims.id });
	save(
		context,
		"claims",
		inserted.map(({ id }) => id),
	);
	return;
}
