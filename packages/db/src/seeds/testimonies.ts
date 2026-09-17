import { testimonies } from "../schema/testimonies";
import {
	createdAt,
	db,
	rows,
	type SeedContext,
	save,
	sentence,
	textId,
} from "./utils";

export async function seedTestimonies(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(testimonies)
		.values(
			rows(count, (i) => ({
				userId: textId(context, "users", i),
				title: `Seed Testimony ${i + 1}`,
				content: sentence(),
				createdAt: createdAt(),
				updatedAt: createdAt(),
			})),
		)
		.returning({ id: testimonies.id });

	save(
		context,
		"testimonies",
		inserted.map(({ id }) => id),
	);
}
