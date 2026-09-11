import { placePassages } from "../schema/place_passages";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedPlacePassages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(placePassages).values(
		rows(count, (i) => ({
			placeId: numberId(context, "places", i),
			passageId: numberId(context, "passages", i),
		})),
	);
	return;
}
