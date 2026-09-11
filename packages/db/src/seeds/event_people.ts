import { eventPeople } from "../schema/event_people";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedEventPeople(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(eventPeople).values(
		rows(count, (i) => ({
			eventId: numberId(context, "events", i),
			personId: numberId(context, "biblicalPeople", i),
		})),
	);
	return;
}
