import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { collections } from "./collections";
import { notes } from "./notes";
import { prayers } from "./prayers";
import { testimonies } from "./testimonies";

export const communityPosts = pgTable(
	"community_posts",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		authorUserId: text("author_user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		postType: text("post_type").notNull(),

		visibility: text("visibility").notNull().default("members"),

		/**
		 * Immutable-by-default representation of what the user
		 * intentionally published to Community.
		 *
		 * The snapshot should only change when the user explicitly
		 * updates their Community post.
		 */
		snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),

		sourceCollectionId: integer("source_collection_id").references(
			() => collections.id,
			{
				onDelete: "set null",
			},
		),

		sourceNoteId: integer("source_note_id").references(() => notes.id, {
			onDelete: "set null",
		}),

		sourceTestimonyId: integer("source_testimony_id").references(
			() => testimonies.id,
			{
				onDelete: "set null",
			},
		),

		sourcePrayerId: integer("source_prayer_id").references(() => prayers.id, {
			onDelete: "set null",
		}),

		publishedAt: timestamp("published_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),

		updatedAt: timestamp("updated_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),

		removedAt: timestamp("removed_at", {
			withTimezone: true,
		}),
	},
	(table) => [
		check(
			"community_posts_post_type_valid",
			sql`${table.postType} IN (
				'collection',
				'note',
				'testimony',
				'prayer'
			)`,
		),

		check(
			"community_posts_visibility_valid",
			sql`${table.visibility} IN (
				'members',
				'public'
			)`,
		),

		check(
			"community_posts_snapshot_is_object",
			sql`jsonb_typeof(${table.snapshot}) = 'object'`,
		),

		/**
		 * A Community post may originate from at most one private resource.
		 *
		 * Zero is allowed because deleting the original private resource
		 * sets its FK to NULL while preserving the published snapshot.
		 */
		check(
			"community_posts_single_source",
			sql`
				num_nonnulls(
					${table.sourceCollectionId},
					${table.sourceNoteId},
					${table.sourceTestimonyId},
					${table.sourcePrayerId}
				) <= 1
			`,
		),

		check(
			"community_posts_collection_source_matches_type",
			sql`
				${table.sourceCollectionId} IS NULL
				OR ${table.postType} = 'collection'
			`,
		),

		check(
			"community_posts_note_source_matches_type",
			sql`
				${table.sourceNoteId} IS NULL
				OR ${table.postType} = 'note'
			`,
		),

		check(
			"community_posts_testimony_source_matches_type",
			sql`
				${table.sourceTestimonyId} IS NULL
				OR ${table.postType} = 'testimony'
			`,
		),

		check(
			"community_posts_prayer_source_matches_type",
			sql`
				${table.sourcePrayerId} IS NULL
				OR ${table.postType} = 'prayer'
			`,
		),

		/**
		 * A private resource can have at most one Community post.
		 *
		 * PostgreSQL unique indexes still allow multiple NULL values,
		 * which is exactly what we want here.
		 */
		uniqueIndex("community_posts_source_collection_unique").on(
			table.sourceCollectionId,
		),

		uniqueIndex("community_posts_source_note_unique").on(table.sourceNoteId),

		uniqueIndex("community_posts_source_testimony_unique").on(
			table.sourceTestimonyId,
		),

		uniqueIndex("community_posts_source_prayer_unique").on(
			table.sourcePrayerId,
		),

		/**
		 * Main Community feed:
		 *
		 * WHERE visibility = ?
		 *   AND removed_at IS NULL
		 * ORDER BY published_at DESC
		 */
		index("community_posts_feed_idx")
			.on(table.visibility, table.publishedAt.desc())
			.where(sql`${table.removedAt} IS NULL`),

		/**
		 * Supports Community sections such as:
		 * - Studies
		 * - Testimonies
		 * - Prayer
		 */
		index("community_posts_type_feed_idx")
			.on(table.postType, table.visibility, table.publishedAt.desc())
			.where(sql`${table.removedAt} IS NULL`),

		/**
		 * Supports:
		 * - My Community posts
		 * - Viewing a member's Community posts
		 */
		index("community_posts_author_idx").on(
			table.authorUserId,
			table.publishedAt.desc(),
		),
	],
);
