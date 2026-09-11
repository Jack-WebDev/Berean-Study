import { eventPlaces } from "../schema/event_places";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedEventPlaces(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(eventPlaces).values(
		rows(count, (i) => ({
			eventId: numberId(context, "events", i),
			placeId: numberId(context, "places", i),
		})),
	);
	return;
}
