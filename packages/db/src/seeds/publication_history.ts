import { publicationHistory } from "../schema/publication_history";
import {
	createdAt,
	db,
	faker,
	numberId,
	rows,
	type SeedContext,
	save,
	textId,
} from "./utils";
export async function seedPublicationHistory(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(publicationHistory)
		.values(
			rows(count, (i) => ({
				contentRevisionId: numberId(context, "contentRevisions", i),
				action: faker.helpers.arrayElement([
					"published",
					"corrected",
					"republished",
					"withdrawn",
				]),
				performedByUserId: textId(context, "users", i),
				createdAt: createdAt(),
			})),
		)
		.returning({ id: publicationHistory.id });
	save(
		context,
		"publicationHistory",
		inserted.map(({ id }) => id),
	);
	return;
}
