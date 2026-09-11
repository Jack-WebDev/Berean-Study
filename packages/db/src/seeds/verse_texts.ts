import { verseTexts } from "../schema/verse_texts";
import { db, numberId, rows, type SeedContext, sentence } from "./utils";
export async function seedVerseTexts(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(verseTexts).values(
		rows(count, (i) => ({
			translationId: numberId(context, "translations", i),
			verseId: numberId(context, "verses", i),
			text: sentence(),
		})),
	);
	return;
}
