import { prayers } from "../schema/prayers";
import {
	createdAt,
	db,
	rows,
	type SeedContext,
	save,
	sentence,
	textId,
} from "./utils";

export async function seedPrayers(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(prayers)
		.values(
			rows(count, (i) => ({
				userId: textId(context, "users", i),
				title: `Seed Prayer ${i + 1}`,
				content: sentence(),
				createdAt: createdAt(),
				updatedAt: createdAt(),
			})),
		)
		.returning({ id: prayers.id });

	save(
		context,
		"prayers",
		inserted.map(({ id }) => id),
	);
}
