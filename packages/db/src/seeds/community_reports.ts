import { communityReports } from "../schema/community_reports";
import {
	createdAt,
	db,
	numberId,
	rows,
	type SeedContext,
	sentence,
	textId,
} from "./utils";

export async function seedCommunityReports(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(communityReports).values(
		rows(count, (i) => {
			const open = i % 2 === 0;
			return {
				communityPostId: numberId(context, "communityPosts", i),
				reportedByUserId: textId(context, "users", i + 1),
				reason: open ? "spam" : "harassment",
				details: sentence(),
				resolution: open ? null : "dismissed",
				reviewedByUserId: open ? null : textId(context, "users", i + 2),
				reviewedAt: open ? null : createdAt(),
				createdAt: createdAt(),
			};
		}),
	);
}
