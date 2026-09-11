import { contentRevisions } from "../schema/content_revisions";
import {
	db,
	numberId,
	rows,
	type SeedContext,
	save,
	sentence,
	textId,
} from "./utils";
export async function seedContentRevisions(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const bookIntroductionRevisions = await db
		.insert(contentRevisions)
		.values(
			rows(count, (i) => ({
				content: sentence(),
				title: `Introduction revision ${i + 1}`,
				position: i + 1,
				createdByUserId: textId(context, "users", i),
				bookIntroductionSectionId: numberId(
					context,
					"bookIntroductionSections",
					i,
				),
			})),
		)
		.returning({ id: contentRevisions.id });
	const commentaryRevisions = await db
		.insert(contentRevisions)
		.values(
			rows(count, (i) => ({
				content: sentence(),
				createdByUserId: textId(context, "users", i),
				commentaryPassageId: numberId(context, "passages", i),
			})),
		)
		.returning({ id: contentRevisions.id });
	const commentarySectionRevisions = await db
		.insert(contentRevisions)
		.values(
			rows(count, (i) => ({
				content: sentence(),
				title: `Commentary revision ${i + 1}`,
				position: i + 1,
				createdByUserId: textId(context, "users", i),
				commentarySectionId: numberId(context, "commentarySections", i),
			})),
		)
		.returning({ id: contentRevisions.id });
	save(
		context,
		"contentRevisions",
		[
			...bookIntroductionRevisions,
			...commentaryRevisions,
			...commentarySectionRevisions,
		].map(({ id }) => id),
	);
	save(
		context,
		"revisionBookIntroductionSections",
		rows(count, (i) => numberId(context, "bookIntroductionSections", i)),
	);
	save(
		context,
		"revisionCommentaries",
		rows(count, (i) => numberId(context, "passages", i)),
	);
	save(
		context,
		"revisionCommentarySections",
		rows(count, (i) => numberId(context, "commentarySections", i)),
	);
	return;
}
