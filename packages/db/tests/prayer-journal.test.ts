import { randomUUID } from "node:crypto";

import type { RichTextDocument } from "@berean-study/rich-text-editor/document";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "../src";
import {
	getPrayerJournalCounts,
	getReflectionReminder,
	setReflectionReminder,
} from "../src/prayer-journal";
import {
	addPrayerUpdate,
	createPrayer,
	createReflection,
	deletePrayer,
	getPrayer,
	listPrayersReadyForReflection,
	listReflections,
	updatePrayer,
	updateReflection,
} from "../src/prayers";
import { user } from "../src/schema/auth";
import { books } from "../src/schema/books";
import { passages } from "../src/schema/passages";
import { prayers } from "../src/schema/prayers";
import {
	createTestimony,
	deleteTestimony,
	listTestimonies,
	updateTestimony,
} from "../src/testimonies";

const describeWithDatabase = process.env.DATABASE_URL
	? describe
	: describe.skip;

describeWithDatabase("prayer journal", () => {
	it("saves a prayer's search text and the passages its verse blocks quote", async () => {
		await withMember(async ({ passageIds: [first, second], userId }) => {
			const prayer = await createPrayer(db, userId, {
				category: "Guidance",
				content: body("Give me **wisdom**", [first, 999_999_999]),
				prayingFor: "Sipho",
				title: "Wisdom",
			});

			expect(prayer).toMatchObject({
				category: "Guidance",
				prayingFor: "Sipho",
				updateCount: 0,
			});
			expect(prayer.passages.map((passage) => passage.id)).toEqual([first]);
			const [stored] = await db
				.select({ searchText: prayers.searchText })
				.from(prayers)
				.where(eq(prayers.id, prayer.id));
			expect(stored?.searchText).toBe("Give me **wisdom**");

			const updated = await updatePrayer(db, userId, {
				content: body("Still asking", [second]),
				id: prayer.id,
				title: "Wisdom",
			});
			expect(updated?.passages.map((passage) => passage.id)).toEqual([second]);
			expect(updated?.prayingFor).toBeNull();
		});
	});

	it("adds updates only to the member's own prayers", async () => {
		await withMember(async ({ userId }) => {
			const prayer = await createPrayer(db, userId, {
				content: body("Healing"),
				title: "Mom",
			});

			const update = await addPrayerUpdate(db, userId, {
				prayerId: prayer.id,
				text: "Surgery went well.",
			});
			expect(update?.text).toBe("Surgery went well.");
			expect(
				await addPrayerUpdate(db, `someone-else-${randomUUID()}`, {
					prayerId: prayer.id,
					text: "Not mine",
				}),
			).toBeNull();

			const detail = await getPrayer(db, userId, prayer.id);
			expect(detail?.updateCount).toBe(1);
			expect(detail?.updates.map((item) => item.text)).toEqual([
				"Surgery went well.",
			]);
		});
	});

	it("links reflections to prayers and keeps them when the prayer is deleted", async () => {
		await withMember(async ({ userId }) => {
			const prayer = await createPrayer(db, userId, {
				content: body("Wisdom"),
				title: "New role",
			});
			const linked = await createReflection(db, userId, {
				content: body("Patience is the wisdom."),
				prayerId: prayer.id,
				prompt: "What has changed since you first prayed this?",
			});
			const free = await createReflection(db, userId, {
				content: body("A free reflection."),
			});

			expect(linked?.prayer?.title).toBe("New role");
			expect(free?.prayer).toBeNull();
			expect(
				(await listReflections(db, userId, { prayerId: prayer.id })).map(
					(reflection) => reflection.id,
				),
			).toEqual([linked?.id]);

			expect(await deletePrayer(db, userId, prayer.id)).toBe(true);
			const remaining = await listReflections(db, userId);
			expect(remaining).toHaveLength(2);
			expect(remaining.every((reflection) => reflection.prayer === null)).toBe(
				true,
			);
		});
	});

	it("won't link a reflection to someone else's prayer", async () => {
		await withMember(async ({ userId }) => {
			await withMember(async ({ userId: otherUserId }) => {
				const theirs = await createPrayer(db, otherUserId, {
					content: body("Private"),
					title: "Theirs",
				});
				const mine = await createReflection(db, userId, {
					content: body("Mine"),
				});

				expect(
					await createReflection(db, userId, {
						content: body("Sneaky"),
						prayerId: theirs.id,
					}),
				).toBeNull();
				expect(
					await updateReflection(db, userId, {
						content: body("Sneaky"),
						id: mine?.id ?? 0,
						prayerId: theirs.id,
					}),
				).toBeNull();
			});
		});
	});

	it("suggests prayers older than three weeks that have no reflection", async () => {
		await withMember(async ({ userId }) => {
			const old = await createPrayer(db, userId, {
				content: body("Old"),
				title: "Old prayer",
			});
			const reflected = await createPrayer(db, userId, {
				content: body("Reflected"),
				title: "Reflected prayer",
			});
			await createPrayer(db, userId, {
				content: body("New"),
				title: "New prayer",
			});
			const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
			for (const id of [old.id, reflected.id])
				await db
					.update(prayers)
					.set({ createdAt: monthAgo })
					.where(eq(prayers.id, id));
			await createReflection(db, userId, {
				content: body("Looking back"),
				prayerId: reflected.id,
			});

			expect(
				(await listPrayersReadyForReflection(db, userId)).map(
					(prayer) => prayer.title,
				),
			).toEqual(["Old prayer"]);
		});
	});

	it("saves testimonies with when they happened and their quoted passages", async () => {
		await withMember(async ({ passageIds: [first], userId }) => {
			const testimony = await createTestimony(db, userId, {
				content: body("The car was fixed", [first]),
				happenedOn: "2026-10-01",
				title: "Provision",
			});

			expect(testimony).toMatchObject({
				happenedOn: "2026-10-01",
				sharedToCommunity: false,
			});
			expect(testimony.passages.map((passage) => passage.id)).toEqual([first]);

			const updated = await updateTestimony(db, userId, {
				content: body("The car was fixed"),
				id: testimony.id,
				title: "Provision",
			});
			expect(updated?.passages).toEqual([]);
			expect(updated?.happenedOn).toBeNull();
			expect(await listTestimonies(db, userId)).toHaveLength(1);

			expect(await deleteTestimony(db, userId, testimony.id)).toBe(true);
			expect(await listTestimonies(db, userId)).toEqual([]);
		});
	});

	it("counts each tab's entries and remembers the reminder choice", async () => {
		await withMember(async ({ userId }) => {
			const prayer = await createPrayer(db, userId, {
				content: body("Prayer"),
				title: "Prayer",
			});
			await createReflection(db, userId, {
				content: body("Reflection"),
				prayerId: prayer.id,
			});

			expect(await getPrayerJournalCounts(db, userId)).toEqual({
				prayers: 1,
				reflections: 1,
				testimonies: 0,
			});

			expect(await getReflectionReminder(db, userId)).toBe(false);
			await setReflectionReminder(db, userId, true);
			expect(await getReflectionReminder(db, userId)).toBe(true);
		});
	});
});

/** A paragraph of text followed by one verse block per passage id. */
function body(text: string, passageIds: number[] = []): RichTextDocument {
	return {
		content: [
			{ content: [{ text, type: "text" }], type: "paragraph" },
			...passageIds.map((passageId) => ({
				attrs: {
					book: "James",
					bookId: 1,
					chapter: 1,
					passageId,
					translation: "ESV",
					verseEnd: 5,
					verseStart: 5,
				},
				type: "verseBlock",
			})),
		],
		type: "doc",
	};
}

/** Creates a member and a book with two passages, then removes them all. */
async function withMember(
	run: (fixture: {
		passageIds: [number, number];
		userId: string;
	}) => Promise<void>,
) {
	const suffix = randomUUID();
	const userId = `prayer-journal-test-${suffix}`;
	await db.insert(user).values({
		email: `${userId}@example.test`,
		id: userId,
		name: "Prayer journal test user",
	});
	const [book] = await db
		.insert(books)
		.values({
			name: `Test book ${suffix}`,
			slug: `test-book-${suffix}`,
			testament: "new",
		})
		.returning({ id: books.id });
	try {
		if (!book) throw new Error("Unable to create a book.");
		const [first, second] = await db
			.insert(passages)
			.values([
				{ bookId: book.id, title: `Passage A ${suffix}` },
				{ bookId: book.id, title: `Passage B ${suffix}` },
			])
			.returning({ id: passages.id });
		if (!first || !second) throw new Error("Unable to create passages.");
		await run({ passageIds: [first.id, second.id], userId });
	} finally {
		// Deleting the member removes their journal and its passage links,
		// which must go before the passages they point at.
		await db.delete(user).where(eq(user.id, userId));
		if (book) {
			await db.delete(passages).where(eq(passages.bookId, book.id));
			await db.delete(books).where(eq(books.id, book.id));
		}
	}
}

afterAll(async () => {
	await pool.end();
});
