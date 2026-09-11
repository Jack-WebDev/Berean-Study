import { canonicalRelationships } from "../schema/canonical_relationships";
import { db, distinctPair, rows, type SeedContext, sentence } from "./utils";
export async function seedCanonicalRelationships(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const values = rows(count, (i) => {
		const pair = distinctPair(context, "passages", i);
		return (
			pair && {
				sourcePassageId: pair[0],
				targetPassageId: pair[1],
				relationshipType: "fulfills",
				explanation: sentence(),
			}
		);
	}).filter(
		(
			value,
		): value is {
			sourcePassageId: number;
			targetPassageId: number;
			relationshipType: string;
			explanation: string;
		} => Boolean(value),
	);
	await db.insert(canonicalRelationships).values(values);
	return;
}
