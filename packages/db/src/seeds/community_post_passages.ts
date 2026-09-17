import { communityPostPassages } from "../schema/community_post_passages";
import { db, numberId, rows, type SeedContext } from "./utils";

export async function seedCommunityPostPassages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(communityPostPassages).values(
		rows(count, (i) => ({
			communityPostId: numberId(context, "communityPosts", i),
			passageId: numberId(context, "passages", i),
		})),
	);
}
