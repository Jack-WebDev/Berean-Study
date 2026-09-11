import { placeRelationships } from "../schema/place_relationships";
import { db, distinctPair, rows, type SeedContext } from "./utils";
export async function seedPlaceRelationships(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const values = rows(count, (i) => {
		const pair = distinctPair(context, "places", i);
		return (
			pair && {
				sourcePlaceId: pair[0],
				targetPlaceId: pair[1],
				relationshipType: "located_in",
			}
		);
	}).filter(
		(
			value,
		): value is {
			sourcePlaceId: number;
			targetPlaceId: number;
			relationshipType: string;
		} => Boolean(value),
	);
	await db.insert(placeRelationships).values(values);
	return;
}
