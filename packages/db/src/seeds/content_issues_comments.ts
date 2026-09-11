import { contentIssueComments } from "../schema/content_issues_comments";
import {
	createdAt,
	db,
	numberId,
	rows,
	type SeedContext,
	save,
	sentence,
	textId,
} from "./utils";
export async function seedContentIssueComments(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(contentIssueComments)
		.values(
			rows(count, (i) => ({
				contentIssueId: numberId(context, "contentIssues", i),
				authorUserId: textId(context, "users", i),
				content: sentence(),
				createdAt: createdAt(),
			})),
		)
		.returning({ id: contentIssueComments.id });
	save(
		context,
		"contentIssueComments",
		inserted.map(({ id }) => id),
	);
	return;
}
