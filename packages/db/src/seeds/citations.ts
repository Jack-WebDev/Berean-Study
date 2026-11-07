import { citations } from "../schema/citations";
import { db, numberId, rows, type SeedContext } from "./utils";

/** Mirrors what each seeded claim's draft says, as saving a draft would. */
export async function seedCitations(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(citations).values(
		rows(count, (i) => ({
			contentRevisionId: numberId(context, "claimRevisions", i),
			excerptId: numberId(context, "sourceExcerpts", i),
			locator: `p. ${i + 1}`,
			position: 1,
			strength: "direct" as const,
		})),
	);
}
