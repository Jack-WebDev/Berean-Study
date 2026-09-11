import { lexemes } from "../schema/lexemes";
import { db, numberId, rows, type SeedContext, save } from "./utils";
export async function seedLexemes(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(lexemes)
		.values(
			rows(count, (i) => ({
				languageId: numberId(context, "languages", i),
				lemma: `lemma-${i + 1}`,
			})),
		)
		.returning({ id: lexemes.id });
	save(
		context,
		"lexemes",
		inserted.map(({ id }) => id),
	);
	return;
}
