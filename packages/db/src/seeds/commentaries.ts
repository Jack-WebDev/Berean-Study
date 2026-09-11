import { commentaries } from "../schema/commentaries";
import { db, numberId, rows, type SeedContext, sentence } from "./utils";
export async function seedCommentaries(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(commentaries).values(
		rows(count, (i) => ({
			passageId: numberId(context, "passages", i),
			content: sentence(),
		})),
	);
	return;
}
