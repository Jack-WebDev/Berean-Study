import { communityPosts } from "../schema/community_posts";
import {
	createdAt,
	db,
	numberId,
	rows,
	type SeedContext,
	save,
	textId,
} from "./utils";

export async function seedCommunityPosts(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(communityPosts)
		.values(
			rows(count, (i) => {
				const authorUserId = textId(context, "users", i);
				const timestamps = {
					publishedAt: createdAt(),
					updatedAt: createdAt(),
				};

				switch (i % 4) {
					case 0:
						return {
							authorUserId,
							postType: "collection",
							snapshot: {
								title: `Seed Collection Post ${i + 1}`,
								kind: "collection",
							},
							sourceCollectionId: numberId(context, "collections", i),
							...timestamps,
						};
					case 1:
						return {
							authorUserId,
							postType: "note",
							snapshot: { title: `Seed Note Post ${i + 1}`, kind: "note" },
							sourceNoteId: numberId(context, "notes", i),
							...timestamps,
						};
					case 2:
						return {
							authorUserId,
							postType: "testimony",
							snapshot: {
								title: `Seed Testimony Post ${i + 1}`,
								kind: "testimony",
							},
							sourceTestimonyId: numberId(context, "testimonies", i),
							...timestamps,
						};
					default:
						return {
							authorUserId,
							postType: "prayer",
							snapshot: { title: `Seed Prayer Post ${i + 1}`, kind: "prayer" },
							sourcePrayerId: numberId(context, "prayers", i),
							...timestamps,
						};
				}
			}),
		)
		.returning({ id: communityPosts.id });

	save(
		context,
		"communityPosts",
		inserted.map(({ id }) => id),
	);
}
