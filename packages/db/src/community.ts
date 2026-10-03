import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import type { createDb } from "./index";
import { user } from "./schema/auth";
import { collectionPassages } from "./schema/collection_passages";
import { collections } from "./schema/collections";
import { communityPostBookmarks } from "./schema/community_post_bookmarks";
import { communityPostPassages } from "./schema/community_post_passages";
import { communityPosts } from "./schema/community_posts";
import { notes } from "./schema/notes";
import { prayerPassages } from "./schema/prayer_passages";
import { prayers } from "./schema/prayers";
import { testimonies } from "./schema/testimonies";
import { testimonyPassages } from "./schema/testimony_passages";

type DbClient = ReturnType<typeof createDb>;
type DbQueryClient = Pick<DbClient, "select">;

export type CommunityPostType = "collection" | "note" | "testimony" | "prayer";

export type CommunityPostSnapshot = {
	excerpt: string;
	title: string;
};

export type CommunityPublicationInput = {
	snapshot?: CommunityPostSnapshot;
	sourceId: number;
	type: CommunityPostType;
};

export type CommunityPublishingResource = {
	excerpt: string;
	id: number;
	isPublished: boolean;
	title: string;
	type: CommunityPostType;
};

/** Lists only the current member's private resources that can be published. */
export async function listCommunityPublishingResources(
	db: DbClient,
	userId: string,
): Promise<CommunityPublishingResource[]> {
	const [noteRows, collectionRows, testimonyRows, prayerRows, publishedRows] =
		await Promise.all([
			db
				.select({ content: notes.content, id: notes.id, title: notes.title })
				.from(notes)
				.where(eq(notes.userId, userId))
				.orderBy(desc(notes.updatedAt), desc(notes.id)),
			db
				.select({
					description: collections.description,
					id: collections.id,
					title: collections.name,
				})
				.from(collections)
				.where(eq(collections.userId, userId))
				.orderBy(desc(collections.updatedAt), desc(collections.id)),
			db
				.select({
					content: testimonies.content,
					id: testimonies.id,
					title: testimonies.title,
				})
				.from(testimonies)
				.where(eq(testimonies.userId, userId))
				.orderBy(desc(testimonies.updatedAt), desc(testimonies.id)),
			db
				.select({
					content: prayers.content,
					id: prayers.id,
					title: prayers.title,
				})
				.from(prayers)
				.where(eq(prayers.userId, userId))
				.orderBy(desc(prayers.updatedAt), desc(prayers.id)),
			db
				.select({
					sourceCollectionId: communityPosts.sourceCollectionId,
					sourceNoteId: communityPosts.sourceNoteId,
					sourcePrayerId: communityPosts.sourcePrayerId,
					sourceTestimonyId: communityPosts.sourceTestimonyId,
				})
				.from(communityPosts)
				.where(
					and(
						eq(communityPosts.authorUserId, userId),
						isNull(communityPosts.removedAt),
					),
				),
		]);

	const published = {
		collection: new Set(
			publishedRows.flatMap((row) =>
				row.sourceCollectionId ? [row.sourceCollectionId] : [],
			),
		),
		note: new Set(
			publishedRows.flatMap((row) =>
				row.sourceNoteId ? [row.sourceNoteId] : [],
			),
		),
		prayer: new Set(
			publishedRows.flatMap((row) =>
				row.sourcePrayerId ? [row.sourcePrayerId] : [],
			),
		),
		testimony: new Set(
			publishedRows.flatMap((row) =>
				row.sourceTestimonyId ? [row.sourceTestimonyId] : [],
			),
		),
	};

	return [
		...noteRows.map((row) =>
			toPublishingResource(row, "note", row.content, published.note),
		),
		...collectionRows.map((row) =>
			toPublishingResource(
				row,
				"collection",
				row.description,
				published.collection,
			),
		),
		...testimonyRows.map((row) =>
			toPublishingResource(row, "testimony", row.content, published.testimony),
		),
		...prayerRows.map((row) =>
			toPublishingResource(row, "prayer", row.content, published.prayer),
		),
	];
}

/** Creates one immutable Community snapshot from a resource owned by the member. */
export async function publishCommunityPost(
	db: DbClient,
	userId: string,
	input: CommunityPublicationInput,
) {
	return db.transaction(async (tx) => {
		const source = await getPublishingSource(
			tx,
			userId,
			input.type,
			input.sourceId,
		);
		if (!source) return null;

		const existing = await findPublishedPost(
			tx,
			userId,
			input.type,
			input.sourceId,
		);
		if (existing) return { alreadyPublished: true, id: existing.id };

		const [post] = await tx
			.insert(communityPosts)
			.values({
				authorUserId: userId,
				postType: input.type,
				snapshot: normalizeSnapshot(input.snapshot ?? source.snapshot),
				...(input.type === "note" ? { sourceNoteId: input.sourceId } : {}),
				...(input.type === "collection"
					? { sourceCollectionId: input.sourceId }
					: {}),
				...(input.type === "testimony"
					? { sourceTestimonyId: input.sourceId }
					: {}),
				...(input.type === "prayer" ? { sourcePrayerId: input.sourceId } : {}),
			})
			.onConflictDoNothing()
			.returning({ id: communityPosts.id });

		if (!post) {
			const publishedPost = await findPublishedPost(
				tx,
				userId,
				input.type,
				input.sourceId,
			);
			if (publishedPost) {
				return { alreadyPublished: true, id: publishedPost.id };
			}
			throw new Error("Unable to publish Community post.");
		}

		if (source.passageIds.length > 0) {
			await tx
				.insert(communityPostPassages)
				.values(
					source.passageIds.map((passageId) => ({
						communityPostId: post.id,
						passageId,
					})),
				)
				.onConflictDoNothing();
		}

		return { alreadyPublished: false, id: post.id };
	});
}

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

export const communityFeedFilters = [
	"featured",
	"recent",
	"collection",
	"note",
	"testimony",
	"prayer",
] as const;

export type CommunityFeedFilter = (typeof communityFeedFilters)[number];

export type CommunityFeedSelection = {
	filter: CommunityFeedFilter;
	page: number;
	pageSize: number;
};

export type CommunityFeedPage = {
	posts: CommunityFeedPost[];
	total: number;
};

export type SavedCommunityPost = {
	coverImage: string | null;
	id: number;
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
	selection: CommunityFeedSelection,
): Promise<CommunityFeedPage> {
	const filter = asCommunityPostType(selection.filter);
	const where = and(
		inArray(communityPosts.visibility, ["members", "public"]),
		isNull(communityPosts.removedAt),
		filter ? eq(communityPosts.postType, filter) : undefined,
	);
	const [rows, totalRows] = await Promise.all([
		db
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
			.where(where)
			.orderBy(desc(communityPosts.publishedAt), desc(communityPosts.id))
			.limit(selection.pageSize)
			.offset((selection.page - 1) * selection.pageSize),
		db.select({ total: count() }).from(communityPosts).where(where),
	]);

	if (rows.length === 0) return { posts: [], total: totalRows[0]?.total ?? 0 };

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

	const posts = rows.flatMap((row) => {
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
	return {
		posts,
		total: totalRows[0]?.total ?? 0,
	};
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

/** Lists a member's saved Community posts for compact previews. */
export async function listSavedCommunityPosts(
	db: DbClient,
	viewerUserId: string,
	limit: number,
): Promise<SavedCommunityPost[]> {
	const rows = await db
		.select({
			id: communityPosts.id,
			postType: communityPosts.postType,
			snapshot: communityPosts.snapshot,
		})
		.from(communityPostBookmarks)
		.innerJoin(
			communityPosts,
			eq(communityPosts.id, communityPostBookmarks.communityPostId),
		)
		.where(
			and(
				eq(communityPostBookmarks.userId, viewerUserId),
				inArray(communityPosts.visibility, ["members", "public"]),
				isNull(communityPosts.removedAt),
			),
		)
		.orderBy(desc(communityPosts.publishedAt), desc(communityPosts.id))
		.limit(limit);

	return rows.flatMap((row) => {
		const type = asCommunityPostType(row.postType);
		if (!type) return [];

		const snapshot = readSnapshot(row.snapshot);
		return {
			coverImage: snapshot.coverImage,
			id: row.id,
			title: snapshot.title ?? `Untitled ${type}`,
			type,
		};
	});
}

async function getPublishingSource(
	db: DbQueryClient,
	userId: string,
	type: CommunityPostType,
	sourceId: number,
) {
	switch (type) {
		case "note": {
			const [source] = await db
				.select({
					content: notes.content,
					passageId: notes.passageId,
					title: notes.title,
				})
				.from(notes)
				.where(and(eq(notes.id, sourceId), eq(notes.userId, userId)))
				.limit(1);
			return source
				? {
						passageIds: source.passageId ? [source.passageId] : [],
						snapshot: createSourceSnapshot(type, source.title, source.content),
					}
				: null;
		}
		case "collection": {
			const [source] = await db
				.select({
					description: collections.description,
					title: collections.name,
				})
				.from(collections)
				.where(
					and(eq(collections.id, sourceId), eq(collections.userId, userId)),
				)
				.limit(1);
			if (!source) return null;
			const passages = await db
				.select({ passageId: collectionPassages.passageId })
				.from(collectionPassages)
				.where(eq(collectionPassages.collectionId, sourceId));
			return {
				passageIds: passages.map((passage) => passage.passageId),
				snapshot: createSourceSnapshot(type, source.title, source.description),
			};
		}
		case "testimony": {
			const [source] = await db
				.select({ content: testimonies.content, title: testimonies.title })
				.from(testimonies)
				.where(
					and(eq(testimonies.id, sourceId), eq(testimonies.userId, userId)),
				)
				.limit(1);
			if (!source) return null;
			const passages = await db
				.select({ passageId: testimonyPassages.passageId })
				.from(testimonyPassages)
				.where(eq(testimonyPassages.testimonyId, sourceId));
			return {
				passageIds: passages.map((passage) => passage.passageId),
				snapshot: createSourceSnapshot(type, source.title, source.content),
			};
		}
		case "prayer": {
			const [source] = await db
				.select({ content: prayers.content, title: prayers.title })
				.from(prayers)
				.where(and(eq(prayers.id, sourceId), eq(prayers.userId, userId)))
				.limit(1);
			if (!source) return null;
			const passages = await db
				.select({ passageId: prayerPassages.passageId })
				.from(prayerPassages)
				.where(eq(prayerPassages.prayerId, sourceId));
			return {
				passageIds: passages.map((passage) => passage.passageId),
				snapshot: createSourceSnapshot(type, source.title, source.content),
			};
		}
	}
}

async function findPublishedPost(
	db: DbQueryClient,
	userId: string,
	type: CommunityPostType,
	sourceId: number,
) {
	const sourceCondition =
		type === "note"
			? eq(communityPosts.sourceNoteId, sourceId)
			: type === "collection"
				? eq(communityPosts.sourceCollectionId, sourceId)
				: type === "testimony"
					? eq(communityPosts.sourceTestimonyId, sourceId)
					: eq(communityPosts.sourcePrayerId, sourceId);
	const [post] = await db
		.select({ id: communityPosts.id })
		.from(communityPosts)
		.where(
			and(
				eq(communityPosts.authorUserId, userId),
				sourceCondition,
				isNull(communityPosts.removedAt),
			),
		)
		.limit(1);
	return post ?? null;
}

function toPublishingResource(
	resource: { id: number; title: string },
	type: CommunityPostType,
	content: string,
	publishedIds: Set<number>,
): CommunityPublishingResource {
	return {
		excerpt: createExcerpt(content),
		id: resource.id,
		isPublished: publishedIds.has(resource.id),
		title: resource.title,
		type,
	};
}

function createSourceSnapshot(
	type: CommunityPostType,
	title: string,
	content: string,
): CommunityPostSnapshot {
	return {
		excerpt: createExcerpt(content) || `Shared a ${type} with the Community.`,
		title: title.trim() || `Untitled ${type}`,
	};
}

function normalizeSnapshot(
	snapshot: CommunityPostSnapshot,
): CommunityPostSnapshot {
	return { excerpt: snapshot.excerpt.trim(), title: snapshot.title.trim() };
}

function createExcerpt(content: string) {
	const text = extractText(content).replace(/\s+/g, " ").trim();
	return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
}

function extractText(content: string): string {
	try {
		return collectText(JSON.parse(content));
	} catch {
		return content;
	}
}

function collectText(value: unknown): string {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.map(collectText).join(" ");
	if (value && typeof value === "object") {
		const record = value as Record<string, unknown>;
		return [record.text, record.content].map(collectText).join(" ");
	}
	return "";
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
