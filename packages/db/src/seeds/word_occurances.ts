import { wordOccurrences } from "../schema/word_occurances";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedWordOccurrences(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(wordOccurrences).values(
		rows(count, (i) => ({
			verseId: numberId(context, "verses", i),
			sourceTextEditionId: numberId(context, "sourceTextEditions", i),
			position: i + 1,
			form: `word-${i + 1}`,
			lexemeId: numberId(context, "lexemes", i),
		})),
	);
	return;
}
