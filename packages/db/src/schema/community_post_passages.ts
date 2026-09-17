import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { communityPosts } from "./community_posts";
import { passages } from "./passages";

export const communityPostPassages = pgTable(
	"community_post_passages",
	{
		communityPostId: integer("community_post_id")
			.notNull()
			.references(() => communityPosts.id, {
				onDelete: "cascade",
			}),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.communityPostId, table.passageId],
		}),

		index("community_post_passages_passage_id_idx").on(table.passageId),
	],
);
