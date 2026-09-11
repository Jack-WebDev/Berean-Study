import { publishedCommentaries } from "../schema/published_commentaries";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedPublishedCommentaries(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(publishedCommentaries).values(
		rows(count, (i) => ({
			passageId: numberId(context, "revisionCommentaries", i),
			contentRevisionId: numberId(context, "contentRevisions", count + i),
		})),
	);
	return;
}
