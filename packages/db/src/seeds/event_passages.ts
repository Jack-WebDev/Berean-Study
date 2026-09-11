import { eventPassages } from "../schema/event_passages";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedEventPassages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(eventPassages).values(
		rows(count, (i) => ({
			eventId: numberId(context, "events", i),
			passageId: numberId(context, "passages", i),
		})),
	);
	return;
}
