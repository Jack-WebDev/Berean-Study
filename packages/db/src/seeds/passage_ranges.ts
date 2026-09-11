import { passageRanges } from "../schema/passage_ranges";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedPassageRanges(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(passageRanges).values(
		rows(count, (i) => ({
			passageId: numberId(context, "passages", i),
			versificationSystemId: numberId(context, "versificationSystems", i),
			startVerseId: numberId(context, "verses", i),
			endVerseId: numberId(context, "verses", i),
		})),
	);
	return;
}
