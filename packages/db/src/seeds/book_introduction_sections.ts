import { bookIntroductionSections } from "../schema/book_introduction_sections";
import { db, numberId, rows, type SeedContext, save, sentence } from "./utils";
export async function seedBookIntroductionSections(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(bookIntroductionSections)
		.values(
			rows(count, (i) => ({
				bookId: numberId(context, "books", i),
				type: `section-${i + 1}`,
				title: `Introduction ${i + 1}`,
				content: sentence(),
				position: i + 1,
			})),
		)
		.returning({ id: bookIntroductionSections.id });
	save(
		context,
		"bookIntroductionSections",
		inserted.map(({ id }) => id),
	);
	return;
}
