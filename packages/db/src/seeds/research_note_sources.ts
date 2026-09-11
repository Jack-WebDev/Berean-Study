import { researchNoteSources } from "../schema/research_note_sources";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedResearchNoteSources(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(researchNoteSources).values(
		rows(count, (i) => ({
			researchNoteId: numberId(context, "researchNotes", i),
			sourceId: numberId(context, "sources", i),
			locator: `p. ${i + 1}`,
		})),
	);
	return;
}
