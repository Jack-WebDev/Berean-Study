import { contentItems } from "../schema/content_items";
import { contentRevisions } from "../schema/content_revisions";
import { db, type SeedContext, textId } from "./utils";

/** Every evidence record is a row plus one draft revision, so it opens in the workbench. */
export async function seedDraftRevisions(
	context: SeedContext,
	kind: "source" | "source_excerpt" | "claim",
	records: { body: unknown; id: number; title: string }[],
) {
	const items = await db
		.insert(contentItems)
		.values(
			records.map(({ id, title }) => ({
				kind,
				scopeKey: String(id),
				title,
			})),
		)
		.returning({ id: contentItems.id });
	return db
		.insert(contentRevisions)
		.values(
			items.map(({ id }, index) => ({
				body: records[index]?.body ?? {},
				contentItemId: id,
				createdByUserId: textId(context, "users", index),
				number: 1,
			})),
		)
		.returning({ id: contentRevisions.id });
}
