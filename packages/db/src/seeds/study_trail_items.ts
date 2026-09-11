import { studyTrailItems } from "../schema/study_trail_items";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedStudyTrailItems(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(studyTrailItems).values(
		rows(count, (i) => ({
			studyTrailId: numberId(context, "studyTrails", i),
			position: i + 1,
			passageId: numberId(context, "passages", i),
		})),
	);
	return;
}
