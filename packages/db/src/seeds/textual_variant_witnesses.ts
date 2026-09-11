import { textualVariantWitnesses } from "../schema/textual_variant_witnesses";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedTextualVariantWitnesses(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(textualVariantWitnesses).values(
		rows(count, (i) => ({
			textualVariantId: numberId(context, "textualVariants", i),
			manuscriptId: numberId(context, "manuscripts", i),
		})),
	);
	return;
}
