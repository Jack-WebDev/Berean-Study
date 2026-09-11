import { commentarySections } from "../schema/commentary_sections";
import { db, numberId, rows, type SeedContext, save, sentence } from "./utils";
export async function seedCommentarySections(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(commentarySections)
		.values(
			rows(count, (i) => ({
				passageId: numberId(context, "passages", i),
				title: `Commentary section ${i + 1}`,
				content: sentence(),
				position: i + 1,
			})),
		)
		.returning({ id: commentarySections.id });
	save(
		context,
		"commentarySections",
		inserted.map(({ id }) => id),
	);
	return;
}
