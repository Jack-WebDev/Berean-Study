import { collections } from "../schema/collections";
import { db, rows, type SeedContext, save, textId } from "./utils";

export async function seedCollections(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(collections)
		.values(
			rows(count, (i) => ({
				userId: textId(context, "users", i),
				name: `Seed Collection ${i + 1}`,
				normalizedName: `seed-collection-${i + 1}`,
				description: "",
				coverId: "seed-cover",
				allowedContent: ["notes"],
				tags: [],
			})),
		)
		.returning({ id: collections.id });

	save(
		context,
		"collections",
		inserted.map(({ id }) => id),
	);
}
