import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { DbExecutor } from "../db-executor";
import { GovernanceError } from "../governance-error";
import { books } from "../schema/books";
import { canonBooks } from "../schema/canon_books";
import { canonTraditions } from "../schema/canon_traditions";
import type { ChangeKindDefinition } from "../two-person";
import { canonChangeAction } from "./chapter-limits";

const bookIds = z.array(z.number().int().positive());

export const canonOrderPayload = z.object({
	canonId: z.number().int().positive(),
	canonSlug: z.string(),
	/** The order when proposed, so a stale proposal can't undo a newer decision. */
	before: bookIds,
	after: bookIds.min(1),
});

export type CanonOrderPayload = z.infer<typeof canonOrderPayload>;

export async function canonBookOrder(client: DbExecutor, canonId: number) {
	const rows = await client
		.select({ bookId: canonBooks.bookId })
		.from(canonBooks)
		.where(eq(canonBooks.canonId, canonId))
		.orderBy(asc(canonBooks.canonicalOrder));
	return rows.map(({ bookId }) => bookId);
}

function sameOrder(a: readonly number[], b: readonly number[]) {
	return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** One change to a canon's book list, in the words the people deciding it use. */
export function describeOrderChange(
	before: readonly number[],
	after: readonly number[],
) {
	const added = after.filter((id) => !before.includes(id));
	const removed = before.filter((id) => !after.includes(id));
	const moved = after.flatMap((id, index) => {
		const from = before.indexOf(id);
		return from !== -1 && from !== index
			? [{ bookId: id, from: from + 1, to: index + 1 }]
			: [];
	});
	return { added, moved, removed };
}

export const canonOrderKind: ChangeKindDefinition<CanonOrderPayload> = {
	payload: canonOrderPayload,
	decidePermission: "canon.manage",
	title: "Canon change",
	target: ({ canonId }) => ({ type: "canon", id: String(canonId) }),
	destination: ({ canonSlug }) => `/admin/canon?canon=${canonSlug}`,
	async describe(client, { canonId, before, after }) {
		const [canon] = await client
			.select({ name: canonTraditions.name })
			.from(canonTraditions)
			.where(eq(canonTraditions.id, canonId));
		const { added, removed } = describeOrderChange(before, after);
		const what =
			added.length > 0 || removed.length > 0 ? "books and order" : "book order";
		return `The ${what} of the ${canon?.name ?? "removed"} canon`;
	},
	async assertAllowed(client, { after, before, canonId }) {
		if (new Set(after).size !== after.length) {
			throw new GovernanceError("A book can only appear once in a canon.");
		}
		if (!sameOrder(await canonBookOrder(client, canonId), before)) {
			throw new GovernanceError(
				"This canon has changed since this was proposed. Propose it again from the current order.",
			);
		}
		const existing = await client
			.select({ id: books.id })
			.from(books)
			.where(inArray(books.id, after));
		if (existing.length !== after.length) {
			throw new GovernanceError("A book in this list no longer exists.");
		}
	},
	async apply(client, { after, canonId }) {
		const current = await client
			.select({ bookId: canonBooks.bookId, limit: canonBooks.chapterLimit })
			.from(canonBooks)
			.where(eq(canonBooks.canonId, canonId));

		// Positions must stay unique at every step, so the list goes back in whole.
		await client.delete(canonBooks).where(eq(canonBooks.canonId, canonId));
		await client.insert(canonBooks).values(
			after.map((bookId, index) => ({
				bookId,
				canonId,
				canonicalOrder: index + 1,
				chapterLimit:
					current.find((row) => row.bookId === bookId)?.limit ?? null,
			})),
		);
	},
	proposedAction: "canon_change.proposed",
	decidedAction: canonChangeAction,
};
