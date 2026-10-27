import { prayerReflections } from "../schema/prayer_reflections";
import {
	createdAt,
	db,
	numberId,
	richTextContent,
	rows,
	type SeedContext,
	sentence,
	textId,
} from "./utils";

export async function seedPrayerReflections(
	context: SeedContext,
	count = 50,
): Promise<void> {
	// Prayer n was seeded for user n, so the reflection goes to that user too.
	const prayerCount = context.ids.prayers?.length ?? 1;
	await db.insert(prayerReflections).values(
		rows(count, (i) => ({
			prayerId: numberId(context, "prayers", i),
			userId: textId(context, "users", i % prayerCount),
			content: richTextContent(sentence()),
			createdAt: createdAt(),
		})),
	);
}
