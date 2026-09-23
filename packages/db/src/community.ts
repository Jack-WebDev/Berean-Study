import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { createDb } from "./index";
import { user } from "./schema/auth";
import { communityPostBookmarks } from "./schema/community_post_bookmarks";
import { communityPostPassages } from "./schema/community_post_passages";
import { communityPosts } from "./schema/community_posts";

type DbClient = ReturnType<typeof createDb>;

export type CommunityPostType = "collection" | "note" | "testimony" | "prayer";

export type CommunityFeedPost = {
	author: {
		id: string;
		image: string | null;
		name: string;
	};
	coverImage: string | null;
	excerpt: string;
	id: number;
	isBookmarked: boolean;
	passageIds: number[];
	publishedAt: Date;
	title: string;
	type: CommunityPostType;
};

/**
 * Returns published Community snapshots. Private source records are never read
 * into the feed, so later edits to a library item cannot alter a publication.
 */
export async function listCommunityFeed(
	db: DbClient,
	viewerUserId: string,
): Promise<CommunityFeedPost[]> {
	const rows = await db
		.select({
			authorId: user.id,
			authorImage: user.image,
			authorName: user.name,
			bookmarkPostId: communityPostBookmarks.communityPostId,
			id: communityPosts.id,
			postType: communityPosts.postType,
			publishedAt: communityPosts.publishedAt,
			snapshot: communityPosts.snapshot,
		})
		.from(communityPosts)
		.innerJoin(user, eq(user.id, communityPosts.authorUserId))
		.leftJoin(
			communityPostBookmarks,
			and(
				eq(communityPostBookmarks.communityPostId, communityPosts.id),
				eq(communityPostBookmarks.userId, viewerUserId),
			),
		)
		.where(
			and(
				inArray(communityPosts.visibility, ["members", "public"]),
				isNull(communityPosts.removedAt),
			),
		)
		.orderBy(desc(communityPosts.publishedAt), desc(communityPosts.id));

	if (rows.length === 0) return [];

	const passageRows = await db
		.select({
			communityPostId: communityPostPassages.communityPostId,
			passageId: communityPostPassages.passageId,
		})
		.from(communityPostPassages)
		.where(
			inArray(
				communityPostPassages.communityPostId,
				rows.map((row) => row.id),
			),
		);

	const passageIdsByPost = new Map<number, number[]>();
	for (const passage of passageRows) {
		const passageIds = passageIdsByPost.get(passage.communityPostId) ?? [];
		passageIds.push(passage.passageId);
		passageIdsByPost.set(passage.communityPostId, passageIds);
	}

	return rows.flatMap((row) => {
		const type = asCommunityPostType(row.postType);
		if (!type) return [];

		const snapshot = readSnapshot(row.snapshot);
		return {
			author: {
				id: row.authorId,
				image: row.authorImage,
				name: row.authorName,
			},
			coverImage: snapshot.coverImage,
			excerpt: snapshot.excerpt ?? `Shared a ${type} with the Community.`,
			id: row.id,
			isBookmarked: row.bookmarkPostId !== null,
			passageIds: passageIdsByPost.get(row.id) ?? [],
			publishedAt: row.publishedAt,
			title: snapshot.title ?? `Untitled ${type}`,
			type,
		};
	});
}

/** Updates only the current viewer's Community-post bookmark relationship. */
export async function setCommunityPostBookmark(
	db: DbClient,
	viewerUserId: string,
	communityPostId: number,
	isBookmarked: boolean,
) {
	const [post] = await db
		.select({ id: communityPosts.id })
		.from(communityPosts)
		.where(
			and(
				eq(communityPosts.id, communityPostId),
				inArray(communityPosts.visibility, ["members", "public"]),
				isNull(communityPosts.removedAt),
			),
		)
		.limit(1);
	if (!post) return false;

	if (isBookmarked) {
		await db
			.insert(communityPostBookmarks)
			.values({ communityPostId, userId: viewerUserId })
			.onConflictDoNothing();
	} else {
		await db
			.delete(communityPostBookmarks)
			.where(
				and(
					eq(communityPostBookmarks.communityPostId, communityPostId),
					eq(communityPostBookmarks.userId, viewerUserId),
				),
			);
	}

	return true;
}

function asCommunityPostType(value: string): CommunityPostType | null {
	return value === "collection" ||
		value === "note" ||
		value === "testimony" ||
		value === "prayer"
		? value
		: null;
}

function readSnapshot(snapshot: Record<string, unknown>) {
	return {
		coverImage: readSnapshotText(snapshot.coverImage),
		excerpt:
			readSnapshotText(snapshot.excerpt) ??
			readSnapshotText(snapshot.description),
		title: readSnapshotText(snapshot.title),
	};
}

function readSnapshotText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}
