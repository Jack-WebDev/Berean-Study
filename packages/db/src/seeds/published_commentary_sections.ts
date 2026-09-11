import { publishedCommentarySections } from "../schema/published_commentary_sections";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedPublishedCommentarySections(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(publishedCommentarySections).values(
		rows(count, (i) => ({
			commentarySectionId: numberId(context, "revisionCommentarySections", i),
			contentRevisionId: numberId(context, "contentRevisions", count * 2 + i),
		})),
	);
	return;
}
