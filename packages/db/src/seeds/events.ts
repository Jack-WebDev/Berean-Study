import { events } from "../schema/events";
import { db, numberId, rows, type SeedContext, save } from "./utils";
export async function seedEvents(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(events)
		.values(
			rows(count, (i) => ({
				name: `Seed Event ${i + 1}`,
				historicalPeriodId: numberId(context, "historicalPeriods", i),
			})),
		)
		.returning({ id: events.id });
	save(
		context,
		"events",
		inserted.map(({ id }) => id),
	);
	return;
}
