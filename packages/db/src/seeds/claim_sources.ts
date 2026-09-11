import { claimSources } from "../schema/claim_sources";
import { db, faker, numberId, rows, type SeedContext, save } from "./utils";
export async function seedClaimSources(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(claimSources)
		.values(
			rows(count, (i) => ({
				claimId: numberId(context, "claims", i),
				sourceId: numberId(context, "sources", i),
				relationship: faker.helpers.arrayElement([
					"supports",
					"disputes",
					"discusses",
				]),
				locator: `p. ${i + 1}`,
			})),
		)
		.returning({ id: claimSources.id });
	save(
		context,
		"claimSources",
		inserted.map(({ id }) => id),
	);
	return;
}
