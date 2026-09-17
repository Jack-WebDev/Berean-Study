import { testimonyPrayers } from "../schema/testimony_prayers";
import { db, numberId, rows, type SeedContext, textId } from "./utils";

export async function seedTestimonyPrayers(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(testimonyPrayers).values(
		rows(count, (i) => ({
			testimonyId: numberId(context, "testimonies", i),
			prayerId: numberId(context, "prayers", i),
			userId: textId(context, "users", i),
		})),
	);
}
