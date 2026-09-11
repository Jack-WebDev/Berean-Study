import { contentIssues } from "../schema/content_issues";
import {
	db,
	faker,
	numberId,
	rows,
	type SeedContext,
	save,
	sentence,
	textId,
} from "./utils";
export async function seedContentIssues(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(contentIssues)
		.values(
			rows(count, (i) => ({
				contentRevisionId: numberId(context, "contentRevisions", i),
				reportedByUserId: textId(context, "users", i),
				issueType: faker.helpers.arrayElement([
					"factual_error",
					"citation_problem",
					"typo",
					"interpretation_concern",
					"broken_reference",
					"other",
				]),
				description: sentence(),
				status: "open" as const,
			})),
		)
		.returning({ id: contentIssues.id });
	save(
		context,
		"contentIssues",
		inserted.map(({ id }) => id),
	);
	return;
}
