import { claims } from "../schema/claims";
import { seedDraftRevisions } from "./evidence-seed-helpers";
import {
	db,
	faker,
	numberId,
	rows,
	type SeedContext,
	save,
	textId,
} from "./utils";

export async function seedClaims(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(claims)
		.values(
			rows(count, (i) => ({
				createdByUserId: textId(context, "users", i),
			})),
		)
		.returning({ id: claims.id });

	const revisions = await seedDraftRevisions(
		context,
		"claim",
		inserted.map(({ id }, i) => {
			const statement = faker.lorem.sentence();
			return {
				body: {
					citations: [
						{
							excerptId: numberId(context, "sourceExcerpts", i),
							locator: `p. ${i + 1}`,
							strength: "direct",
						},
					],
					confidence: "probable",
					kind: "textual",
					passage: "Romans 8:28",
					statement,
				},
				id,
				title: statement,
			};
		}),
	);

	save(
		context,
		"claims",
		inserted.map(({ id }) => id),
	);
	save(
		context,
		"claimRevisions",
		revisions.map(({ id }) => id),
	);
}
