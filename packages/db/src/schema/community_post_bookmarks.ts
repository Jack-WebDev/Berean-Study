import { index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { communityPosts } from "./community_posts";

export const communityPostBookmarks = pgTable(
	"community_post_bookmarks",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		communityPostId: integer("community_post_id")
			.notNull()
			.references(() => communityPosts.id, {
				onDelete: "cascade",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.userId, table.communityPostId],
		}),

		index("community_post_bookmarks_community_post_id_idx").on(
			table.communityPostId,
		),
	],
);
