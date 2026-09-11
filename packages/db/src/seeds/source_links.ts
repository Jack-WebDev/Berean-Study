import { sourceLinks } from "../schema/source_links";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedSourceLinks(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(sourceLinks).values(
		rows(count, (i) => ({
			sourceId: numberId(context, "sources", i),
			url: `https://example.com/seed-source-${i + 1}`,
			kind: "website",
		})),
	);
	return;
}
