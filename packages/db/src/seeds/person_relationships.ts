import { personRelationships } from "../schema/person_relationships";
import { db, distinctPair, rows, type SeedContext } from "./utils";
export async function seedPersonRelationships(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const values = rows(count, (i) => {
		const pair = distinctPair(context, "biblicalPeople", i);
		return (
			pair && {
				sourcePersonId: pair[0],
				targetPersonId: pair[1],
				relationshipType: "related_to",
			}
		);
	}).filter(
		(
			value,
		): value is {
			sourcePersonId: number;
			targetPersonId: number;
			relationshipType: string;
		} => Boolean(value),
	);
	await db.insert(personRelationships).values(values);
	return;
}
