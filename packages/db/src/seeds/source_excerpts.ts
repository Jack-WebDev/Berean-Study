import { sourceExcerpts } from "../schema/source_excerpts";
import { seedDraftRevisions } from "./evidence-seed-helpers";
import {
	db,
	numberId,
	rows,
	type SeedContext,
	save,
	sentence,
	textId,
} from "./utils";

export async function seedSourceExcerpts(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(sourceExcerpts)
		.values(
			rows(count, (i) => ({
				createdByUserId: textId(context, "users", i),
				sourceId: numberId(context, "sources", i),
			})),
		)
		.returning({ id: sourceExcerpts.id });

	await seedDraftRevisions(
		context,
		"source_excerpt",
		inserted.map(({ id }, i) => ({
			body: {
				form: "summary",
				location: `p. ${i + 1}`,
				passages: [],
				text: sentence(),
			},
			id,
			title: `Seed Source ${(i % count) + 1}: p. ${i + 1}`,
		})),
	);

	save(
		context,
		"sourceExcerpts",
		inserted.map(({ id }) => id),
	);
}
