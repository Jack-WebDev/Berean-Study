import { translations } from "../schema/translations";
import { db, faker, numberId, rows, type SeedContext, save } from "./utils";
export async function seedTranslations(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(translations)
		.values(
			rows(count, (i) => ({
				versificationSystemId: numberId(context, "versificationSystems", i),
				name: `Seed Translation ${i + 1}`,
				abbreviation: `ST${i + 1}`,
				slug: `seed-translation-${i + 1}-${faker.string.alphanumeric(4).toLowerCase()}`,
			})),
		)
		.returning({ id: translations.id });
	save(
		context,
		"translations",
		inserted.map(({ id }) => id),
	);
	return;
}
