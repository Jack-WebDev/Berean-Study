import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "../src";
import {
	listCommunityFeed,
	listSavedCommunityPosts,
	publishCommunityPost,
	setCommunityPostBookmark,
} from "../src/community";
import { user } from "../src/schema/auth";
import { books } from "../src/schema/books";
import { communityPostPassages } from "../src/schema/community_post_passages";
import { communityPosts } from "../src/schema/community_posts";
import { notes } from "../src/schema/notes";
import { passages } from "../src/schema/passages";
import { testimonies } from "../src/schema/testimonies";
import { testimonyPassages } from "../src/schema/testimony_passages";

const describeWithDatabase = process.env.DATABASE_URL
	? describe
	: describe.skip;

describeWithDatabase("Community publication", () => {
	it("publishes an immutable testimony snapshot with its Scripture passages", async () => {
		const suffix = randomUUID();
		const ownerId = `community-owner-${suffix}`;
		const otherUserId = `community-other-${suffix}`;
		let bookId: number | undefined;
		let passageId: number | undefined;
		let rollbackPassageId: number | undefined;

		try {
			await db.insert(user).values([
				{
					email: `community-owner-${suffix}@example.test`,
					id: ownerId,
					name: "Community owner",
				},
				{
					email: `community-other-${suffix}@example.test`,
					id: otherUserId,
					name: "Other member",
				},
			]);

			const [book] = await db
				.insert(books)
				.values({
					name: `Community test book ${suffix}`,
					slug: `community-test-book-${suffix}`,
					testament: "new",
				})
				.returning({ id: books.id });
			bookId = book?.id;
			if (!bookId) throw new Error("Unable to create test book.");

			const [passage] = await db
				.insert(passages)
				.values({ bookId, title: "Community test passage" })
				.returning({ id: passages.id });
			passageId = passage?.id;
			if (!passageId) throw new Error("Unable to create test passage.");

			const [testimony] = await db
				.insert(testimonies)
				.values({
					content: JSON.stringify({
						content: [
							{
								content: [{ text: "God met us in a difficult season." }],
							},
						],
					}),
					title: "A faithful season",
					userId: ownerId,
				})
				.returning({ id: testimonies.id });
			if (!testimony) throw new Error("Unable to create test testimony.");

			await db
				.insert(testimonyPassages)
				.values({ passageId, testimonyId: testimony.id });

			const published = await publishCommunityPost(db, ownerId, {
				sourceId: testimony.id,
				type: "testimony",
			});
			expect(published).toEqual({
				alreadyPublished: false,
				id: expect.any(Number),
			});
			if (!published) throw new Error("Expected a Community post.");

			const [post] = await db
				.select({ snapshot: communityPosts.snapshot })
				.from(communityPosts)
				.where(eq(communityPosts.id, published.id));
			expect(post?.snapshot).toEqual({
				excerpt: "God met us in a difficult season.",
				title: "A faithful season",
			});

			const postPassages = await db
				.select({ passageId: communityPostPassages.passageId })
				.from(communityPostPassages)
				.where(eq(communityPostPassages.communityPostId, published.id));
			expect(postPassages).toEqual([{ passageId }]);

			await db
				.update(testimonies)
				.set({
					content: "Changed source content",
					title: "Changed source title",
				})
				.where(eq(testimonies.id, testimony.id));
			const [unchangedPost] = await db
				.select({ snapshot: communityPosts.snapshot })
				.from(communityPosts)
				.where(eq(communityPosts.id, published.id));
			expect(unchangedPost?.snapshot).toEqual(post?.snapshot);

			const duplicate = await publishCommunityPost(db, ownerId, {
				sourceId: testimony.id,
				type: "testimony",
			});
			expect(duplicate).toEqual({ alreadyPublished: true, id: published.id });

			const [note] = await db
				.insert(notes)
				.values({
					content: "A note shared with the Community.",
					title: "A community note",
					userId: ownerId,
				})
				.returning({ id: notes.id });
			if (!note) throw new Error("Unable to create test note.");
			await publishCommunityPost(db, ownerId, {
				sourceId: note.id,
				type: "note",
			});

			const [failingTestimony] = await db
				.insert(testimonies)
				.values({
					content: "This publication must roll back.",
					title: "A failed publication",
					userId: ownerId,
				})
				.returning({ id: testimonies.id });
			if (!failingTestimony) {
				throw new Error("Unable to create rollback test testimony.");
			}
			const [rollbackPassage] = await db
				.insert(passages)
				.values({ bookId, title: "Community rollback test passage" })
				.returning({ id: passages.id });
			if (!rollbackPassage) {
				throw new Error("Unable to create rollback test passage.");
			}
			rollbackPassageId = rollbackPassage.id;
			await db.insert(testimonyPassages).values({
				passageId: rollbackPassage.id,
				testimonyId: failingTestimony.id,
			});

			const failureConstraintName = `community_rollback_${suffix.replaceAll("-", "")}`;
			await db.execute(
				sql.raw(
					`ALTER TABLE community_post_passages ADD CONSTRAINT ${failureConstraintName} CHECK (passage_id <> ${rollbackPassage.id})`,
				),
			);
			try {
				await expect(
					publishCommunityPost(db, ownerId, {
						sourceId: failingTestimony.id,
						type: "testimony",
					}),
				).rejects.toThrow();
			} finally {
				await db.execute(
					sql.raw(
						`ALTER TABLE community_post_passages DROP CONSTRAINT ${failureConstraintName}`,
					),
				);
			}
			const failedPosts = await db
				.select({ id: communityPosts.id })
				.from(communityPosts)
				.where(eq(communityPosts.sourceTestimonyId, failingTestimony.id));
			expect(failedPosts).toEqual([]);

			const testimonyFeed = await listCommunityFeed(db, ownerId, {
				page: 1,
				pageSize: 10,
				view: "testimony",
			});
			expect(testimonyFeed.total).toBeGreaterThanOrEqual(1);
			expect(testimonyFeed.posts).not.toHaveLength(0);
			expect(
				testimonyFeed.posts.every((post) => post.type === "testimony"),
			).toBe(true);

			const recentFeed = await listCommunityFeed(db, ownerId, {
				page: 1,
				pageSize: 1,
				view: "recent",
			});
			expect(recentFeed.total).toBeGreaterThan(testimonyFeed.total);
			expect(recentFeed.posts).toHaveLength(1);
			expect(recentFeed.featuredPost).toBeNull();

			const featuredFeed = await listCommunityFeed(db, ownerId, {
				page: 1,
				pageSize: 10,
				view: "featured",
			});
			expect(featuredFeed.featuredPost?.type).toBe("testimony");
			expect(
				featuredFeed.posts.some(
					(post) => post.id === featuredFeed.featuredPost?.id,
				),
			).toBe(false);

			expect(
				await setCommunityPostBookmark(db, otherUserId, published.id, true),
			).toBe(true);
			expect(await listSavedCommunityPosts(db, otherUserId, 2)).toEqual([
				{
					coverImage: null,
					id: published.id,
					title: "A faithful season",
					type: "testimony",
				},
			]);
			expect(
				await setCommunityPostBookmark(db, otherUserId, published.id, false),
			).toBe(true);
			expect(await listSavedCommunityPosts(db, otherUserId, 2)).toEqual([]);

			await expect(
				publishCommunityPost(db, otherUserId, {
					sourceId: testimony.id,
					type: "testimony",
				}),
			).resolves.toBeNull();
		} finally {
			await db.delete(user).where(eq(user.id, ownerId));
			await db.delete(user).where(eq(user.id, otherUserId));
			if (passageId) {
				await db.delete(passages).where(eq(passages.id, passageId));
			}
			if (rollbackPassageId) {
				await db.delete(passages).where(eq(passages.id, rollbackPassageId));
			}
			if (bookId) {
				await db.delete(books).where(eq(books.id, bookId));
			}
		}
	});
});

afterAll(async () => {
	await pool.end();
});
