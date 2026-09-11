import { crossReferences } from "../schema/cross_references";
import { db, distinctPair, rows, type SeedContext, sentence } from "./utils";
export async function seedCrossReferences(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const values = rows(count, (i) => {
		const pair = distinctPair(context, "passages", i);
		return (
			pair && {
				passageId: pair[0],
				relatedPassageId: pair[1],
				explanation: sentence(),
			}
		);
	}).filter(
		(
			value,
		): value is {
			passageId: number;
			relatedPassageId: number;
			explanation: string;
		} => Boolean(value),
	);
	await db.insert(crossReferences).values(values);
	return;
}
