import { communityPostBookmarks } from "../schema/community_post_bookmarks";
import { db, numberId, rows, type SeedContext, textId } from "./utils";

export async function seedCommunityPostBookmarks(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(communityPostBookmarks).values(
		rows(count, (i) => ({
			userId: textId(context, "users", i + 1),
			communityPostId: numberId(context, "communityPosts", i),
		})),
	);
}
