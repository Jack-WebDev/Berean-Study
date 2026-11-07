import { emptyBookOverview } from "../book-overview";
import { contentItems } from "../schema/content_items";
import { contentRevisions } from "../schema/content_revisions";
import { db, rows, type SeedContext, save, sentence, textId } from "./utils";

export async function seedContentRevisions(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const items = await db
		.insert(contentItems)
		.values(
			rows(count, (i) => ({
				kind: "book_overview",
				scopeKey: `seed-book-${i + 1}`,
				title: `Seed book ${i + 1} overview`,
			})),
		)
		.returning({ id: contentItems.id });

	const revisions = await db
		.insert(contentRevisions)
		.values(
			items.map(({ id }, i) => ({
				body: { ...emptyBookOverview, summary: sentence() },
				contentItemId: id,
				createdByUserId: textId(context, "users", i),
				number: 1,
			})),
		)
		.returning({ id: contentRevisions.id });

	save(
		context,
		"contentRevisions",
		revisions.map(({ id }) => id),
	);
}
