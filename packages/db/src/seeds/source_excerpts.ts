import { sourceExcerpts } from "../schema/source_excerpts";
import { db, numberId, rows, type SeedContext, save, sentence } from "./utils";
export async function seedSourceExcerpts(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(sourceExcerpts)
		.values(
			rows(count, (i) => ({
				sourceId: numberId(context, "sources", i),
				locator: `p. ${i + 1}`,
				text: sentence(),
			})),
		)
		.returning({ id: sourceExcerpts.id });
	save(
		context,
		"sourceExcerpts",
		inserted.map(({ id }) => id),
	);
	return;
}
