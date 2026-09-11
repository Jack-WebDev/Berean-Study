import { sourceTextEditions } from "../schema/source_text_editions";
import { db, numberId, rows, type SeedContext, save } from "./utils";
export async function seedSourceTextEditions(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(sourceTextEditions)
		.values(
			rows(count, (i) => ({
				languageId: numberId(context, "languages", i),
				versificationSystemId: numberId(context, "versificationSystems", i),
				name: `Seed Text Edition ${i + 1}`,
				abbreviation: `STE${i + 1}`,
			})),
		)
		.returning({ id: sourceTextEditions.id });
	save(
		context,
		"sourceTextEditions",
		inserted.map(({ id }) => id),
	);
	return;
}
