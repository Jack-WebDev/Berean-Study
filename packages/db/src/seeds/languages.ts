import { languages } from "../schema/languages";
import { db, rows, type SeedContext, save } from "./utils";
export async function seedLanguages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(languages)
		.values(
			rows(count, (index) => ({
				code: `x${index.toString().padStart(3, "0")}`,
				name: `Seed Language ${index + 1}`,
			})),
		)
		.returning({ id: languages.id });
	save(
		context,
		"languages",
		inserted.map(({ id }) => id),
	);
	return;
}
