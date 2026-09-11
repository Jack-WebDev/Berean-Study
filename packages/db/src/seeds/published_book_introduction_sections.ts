import { publishedBookIntroductionSections } from "../schema/published_book_introduction_sections";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedPublishedBookIntroductionSections(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(publishedBookIntroductionSections).values(
		rows(count, (i) => ({
			bookIntroductionSectionId: numberId(
				context,
				"revisionBookIntroductionSections",
				i,
			),
			contentRevisionId: numberId(context, "contentRevisions", i),
		})),
	);
	return;
}
