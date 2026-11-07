import { sourceLabel, sourceTypes } from "../evidence-body";
import { sources } from "../schema/sources";
import { seedDraftRevisions } from "./evidence-seed-helpers";
import { db, faker, rows, type SeedContext, save, textId } from "./utils";

export async function seedSources(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(sources)
		.values(
			rows(count, (index) => ({
				createdByUserId: textId(context, "users", index),
			})),
		)
		.returning({ id: sources.id });

	await seedDraftRevisions(
		context,
		"source",
		inserted.map(({ id }, index) => {
			const body = {
				authors: faker.person.fullName(),
				edition: "",
				publisher: faker.company.name(),
				title: `Seed Source ${index + 1}: ${faker.lorem.words(3)}`,
				type: faker.helpers.arrayElement(sourceTypes),
				year: String(faker.number.int({ min: 1900, max: 2025 })),
			};
			return { body, id, title: sourceLabel(body) };
		}),
	);

	save(
		context,
		"sources",
		inserted.map(({ id }) => id),
	);
}
