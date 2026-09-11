import { interpretationViews } from "../schema/interpretation_views";
import { db, numberId, rows, type SeedContext, save, sentence } from "./utils";
export async function seedInterpretationViews(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(interpretationViews)
		.values(
			rows(count, (i) => ({
				interpretiveQuestionId: numberId(context, "interpretiveQuestions", i),
				name: `Seed interpretation ${i + 1}`,
				content: sentence(),
			})),
		)
		.returning({ id: interpretationViews.id });
	save(
		context,
		"interpretationViews",
		inserted.map(({ id }) => id),
	);
	return;
}
