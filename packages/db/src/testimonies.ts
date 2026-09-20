import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { createDb } from "./index";
import { communityPosts } from "./schema/community_posts";
import { passages } from "./schema/passages";
import { testimonies } from "./schema/testimonies";
import { testimonyNotes } from "./schema/testimony_notes";
import { testimonyPassages } from "./schema/testimony_passages";
import { testimonyPrayers } from "./schema/testimony_prayers";

type DbClient = ReturnType<typeof createDb>;

export type Testimony = {
	content: string;
	createdAt: Date;
	id: number;
	passages: { id: number; title: string | null }[];
	prayerCount: number;
	noteCount: number;
	sharedToCommunity: boolean;
	title: string;
	updatedAt: Date;
};

export async function createTestimony(
	db: DbClient,
	userId: string,
	input: { content: string; title: string },
) {
	const [testimony] = await db
		.insert(testimonies)
		.values({ ...input, userId })
		.returning();
	if (!testimony) throw new Error("Unable to create testimony.");
	return testimony;
}

export async function getTestimony(db: DbClient, userId: string, id: number) {
	const [testimony] = await db
		.select()
		.from(testimonies)
		.where(and(eq(testimonies.id, id), eq(testimonies.userId, userId)));
	return testimony ?? null;
}

export async function updateTestimony(
	db: DbClient,
	userId: string,
	input: { content: string; id: number; title: string },
) {
	const [testimony] = await db
		.update(testimonies)
		.set({ content: input.content, title: input.title, updatedAt: new Date() })
		.where(and(eq(testimonies.id, input.id), eq(testimonies.userId, userId)))
		.returning();
	return testimony ?? null;
}

export async function shareTestimony(
	db: DbClient,
	userId: string,
	testimonyId: number,
) {
	const testimony = await getTestimony(db, userId, testimonyId);
	if (!testimony) return null;
	const [existing] = await db
		.select({ id: communityPosts.id })
		.from(communityPosts)
		.where(
			and(
				eq(communityPosts.authorUserId, userId),
				eq(communityPosts.sourceTestimonyId, testimonyId),
				isNull(communityPosts.removedAt),
			),
		)
		.limit(1);
	if (existing) return existing;
	const [post] = await db
		.insert(communityPosts)
		.values({
			authorUserId: userId,
			postType: "testimony",
			snapshot: { content: testimony.content, title: testimony.title },
			sourceTestimonyId: testimonyId,
		})
		.returning({ id: communityPosts.id });
	return post ?? null;
}

export async function listTestimonies(db: DbClient, userId: string) {
	const rows = await db
		.select()
		.from(testimonies)
		.where(eq(testimonies.userId, userId))
		.orderBy(desc(testimonies.updatedAt), desc(testimonies.id));
	if (rows.length === 0) return [] as Testimony[];

	const ids = rows.map((testimony) => testimony.id);
	const [linkedPassages, linkedPrayers, linkedNotes, shared] =
		await Promise.all([
			db
				.select({
					testimonyId: testimonyPassages.testimonyId,
					id: passages.id,
					title: passages.title,
				})
				.from(testimonyPassages)
				.innerJoin(passages, eq(passages.id, testimonyPassages.passageId))
				.where(inArray(testimonyPassages.testimonyId, ids)),
			db
				.select({ testimonyId: testimonyPrayers.testimonyId })
				.from(testimonyPrayers)
				.where(
					and(
						eq(testimonyPrayers.userId, userId),
						inArray(testimonyPrayers.testimonyId, ids),
					),
				),
			db
				.select({ testimonyId: testimonyNotes.testimonyId })
				.from(testimonyNotes)
				.where(
					and(
						eq(testimonyNotes.userId, userId),
						inArray(testimonyNotes.testimonyId, ids),
					),
				),
			db
				.select({ testimonyId: communityPosts.sourceTestimonyId })
				.from(communityPosts)
				.where(
					and(
						eq(communityPosts.authorUserId, userId),
						inArray(communityPosts.sourceTestimonyId, ids),
						isNull(communityPosts.removedAt),
					),
				),
		]);
	const passagesByTestimony = new Map<number, Testimony["passages"]>();
	for (const passage of linkedPassages) {
		const current = passagesByTestimony.get(passage.testimonyId) ?? [];
		current.push({ id: passage.id, title: passage.title });
		passagesByTestimony.set(passage.testimonyId, current);
	}
	const prayerCounts = countByTestimony(linkedPrayers);
	const noteCounts = countByTestimony(linkedNotes);
	const sharedIds = new Set(
		shared.flatMap((post) => (post.testimonyId ? [post.testimonyId] : [])),
	);
	return rows.map((testimony) => ({
		...testimony,
		passages: passagesByTestimony.get(testimony.id) ?? [],
		prayerCount: prayerCounts.get(testimony.id) ?? 0,
		noteCount: noteCounts.get(testimony.id) ?? 0,
		sharedToCommunity: sharedIds.has(testimony.id),
	}));
}

function countByTestimony(rows: { testimonyId: number }[]) {
	const counts = new Map<number, number>();
	for (const row of rows)
		counts.set(row.testimonyId, (counts.get(row.testimonyId) ?? 0) + 1);
	return counts;
}
