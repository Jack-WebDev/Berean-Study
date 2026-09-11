import { historicalPeriods } from "../schema/historical_periods";
import { db, rows, type SeedContext, save } from "./utils";
export async function seedHistoricalPeriods(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(historicalPeriods)
		.values(
			rows(count, (index) => ({
				name: `Seed Historical Period ${index + 1}`,
			})),
		)
		.returning({ id: historicalPeriods.id });
	save(
		context,
		"historicalPeriods",
		inserted.map(({ id }) => id),
	);
	return;
}
