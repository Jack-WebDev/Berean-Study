import { interpretiveQuestions } from "../schema/interpretative_questions";
import { db, numberId, rows, type SeedContext, save } from "./utils";
export async function seedInterpretiveQuestions(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(interpretiveQuestions)
		.values(
			rows(count, (i) => ({
				passageId: numberId(context, "passages", i),
				question: `How should seed passage ${i + 1} be understood?`,
			})),
		)
		.returning({ id: interpretiveQuestions.id });
	save(
		context,
		"interpretiveQuestions",
		inserted.map(({ id }) => id),
	);
	return;
}
