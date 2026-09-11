import { citations } from "../schema/citations";
import { db, numberId, rows, type SeedContext, save } from "./utils";
export async function seedCitations(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(citations)
		.values(
			rows(count, (i) => ({
				sourceId: numberId(context, "sources", i),
				locator: `p. ${i + 1}`,
				contentRevisionId: numberId(context, "contentRevisions", i),
			})),
		)
		.returning({ id: citations.id });
	save(
		context,
		"citations",
		inserted.map(({ id }) => id),
	);
	return;
}
