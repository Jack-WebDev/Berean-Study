import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "../src";
import { setCollectionsForPassage } from "../src/collections";
import { user } from "../src/schema/auth";
import { books } from "../src/schema/books";
import { collectionPassages } from "../src/schema/collection_passages";
import { collections } from "../src/schema/collections";
import { passages } from "../src/schema/passages";

const describeWithDatabase = process.env.DATABASE_URL
	? describe
	: describe.skip;

describeWithDatabase("passage collection memberships", () => {
	it("keeps another user's membership when a shared passage is updated", async () => {
		const suffix = randomUUID();
		const userAId = `collection-test-a-${suffix}`;
		const userBId = `collection-test-b-${suffix}`;
		let bookId: number | undefined;
		let passageId: number | undefined;

		try {
			await db.insert(user).values([
				{
					email: `collection-test-a-${suffix}@example.test`,
					id: userAId,
					name: "Collection test user A",
				},
				{
					email: `collection-test-b-${suffix}@example.test`,
					id: userBId,
					name: "Collection test user B",
				},
			]);

			const [book] = await db
				.insert(books)
				.values({
					name: `Collection test book ${suffix}`,
					slug: `collection-test-book-${suffix}`,
					testament: "new",
				})
				.returning({ id: books.id });
			bookId = book?.id;
			if (!bookId) throw new Error("Unable to create test book.");

			const [passage] = await db
				.insert(passages)
				.values({ bookId, title: "Collection test passage" })
				.returning({ id: passages.id });
			passageId = passage?.id;
			if (!passageId) throw new Error("Unable to create test passage.");

			const [aFirstCollection, aSecondCollection, bCollection] = await db
				.insert(collections)
				.values([
					{
						allowedContent: ["passages"],
						coverId: "default",
						name: "User A first collection",
						normalizedName: "user a first collection",
						userId: userAId,
					},
					{
						allowedContent: ["passages"],
						coverId: "default",
						name: "User A second collection",
						normalizedName: "user a second collection",
						userId: userAId,
					},
					{
						allowedContent: ["passages"],
						coverId: "default",
						name: "User B collection",
						normalizedName: "user b collection",
						userId: userBId,
					},
				])
				.returning({ id: collections.id });
			if (!aFirstCollection || !aSecondCollection || !bCollection) {
				throw new Error("Unable to create test collections.");
			}

			await db.insert(collectionPassages).values([
				{ collectionId: aFirstCollection.id, passageId },
				{ collectionId: bCollection.id, passageId },
			]);

			await setCollectionsForPassage(db, userAId, passageId, [
				aSecondCollection.id,
			]);

			const memberships = await db
				.select({ collectionId: collectionPassages.collectionId })
				.from(collectionPassages)
				.where(
					and(
						eq(collectionPassages.passageId, passageId),
						inArray(collectionPassages.collectionId, [
							aFirstCollection.id,
							aSecondCollection.id,
							bCollection.id,
						]),
					),
				);

			expect(memberships.map((membership) => membership.collectionId)).toEqual(
				expect.arrayContaining([aSecondCollection.id, bCollection.id]),
			);
			expect(memberships).toHaveLength(2);
		} finally {
			await db.delete(user).where(inArray(user.id, [userAId, userBId]));
			if (passageId) {
				await db.delete(passages).where(eq(passages.id, passageId));
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
