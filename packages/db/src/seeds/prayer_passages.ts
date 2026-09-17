import { prayerPassages } from "../schema/prayer_passages";
import { db, numberId, rows, type SeedContext } from "./utils";

export async function seedPrayerPassages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(prayerPassages).values(
		rows(count, (i) => ({
			prayerId: numberId(context, "prayers", i),
			passageId: numberId(context, "passages", i),
		})),
	);
}
