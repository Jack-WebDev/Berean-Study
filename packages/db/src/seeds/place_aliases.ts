import { placeAliases } from "../schema/place_aliases";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedPlaceAliases(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(placeAliases).values(
		rows(count, (i) => ({
			placeId: numberId(context, "places", i),
			alias: `Seed Place Alias ${i + 1}`,
		})),
	);
	return;
}
