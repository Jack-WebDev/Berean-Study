import { editorialReviews } from "../schema/editorial_reviews";
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
export async function seedEditorialReviews(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(editorialReviews)
		.values(
			rows(count, (i) => ({
				contentRevisionId: numberId(context, "contentRevisions", i),
				reviewerUserId: textId(context, "users", i),
				decision: "approved" as const,
				feedback: sentence(),
				createdAt: createdAt(),
			})),
		)
		.returning({ id: editorialReviews.id });
	save(
		context,
		"editorialReviews",
		inserted.map(({ id }) => id),
	);
	return;
}
