import { prayerReflections } from "../schema/prayer_reflections";
import {
	createdAt,
	db,
	numberId,
	rows,
	type SeedContext,
	sentence,
} from "./utils";

export async function seedPrayerReflections(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(prayerReflections).values(
		rows(count, (i) => ({
			prayerId: numberId(context, "prayers", i),
			content: sentence(),
			createdAt: createdAt(),
		})),
	);
}
