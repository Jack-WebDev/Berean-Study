import { and, eq, inArray, max, ne } from "drizzle-orm";
import { z } from "zod";

import type { DbExecutor } from "../db-executor";
import { GovernanceError } from "../governance-error";
import { books } from "../schema/books";
import { canonBooks } from "../schema/canon_books";
import { canonTraditions } from "../schema/canon_traditions";
import { chapters } from "../schema/chapters";
import type { ChangeDecision, ChangeKindDefinition } from "../two-person";

export const chapterLimitsPayload = z.object({
	canonId: z.number().int().positive(),
	canonSlug: z.string(),
	changes: z
		.array(
			z.object({
				bookId: z.number().int().positive(),
				/** What it was when proposed, so a stale proposal can't overwrite a newer decision. */
				from: z.number().int().positive().nullable(),
				to: z.number().int().positive(),
			}),
		)
		.min(1),
});

export type ChapterLimitsPayload = z.infer<typeof chapterLimitsPayload>;

export function canonChangeAction(decision: ChangeDecision) {
	if (decision === "confirm") return "canon_change.confirmed" as const;
	return decision === "return"
		? ("canon_change.returned" as const)
		: ("canon_change.rejected" as const);
}

/** Chapters are shared, so a limit can only drop while another canon still covers them. */
async function assertChaptersStillFit(
	client: DbExecutor,
	input: { bookId: number; bookName: string; canonId: number; to: number },
) {
	const [existing] = await client
		.select({ value: max(chapters.number) })
		.from(chapters)
		.where(eq(chapters.bookId, input.bookId));
	const [otherCanons] = await client
		.select({ value: max(canonBooks.chapterLimit) })
		.from(canonBooks)
		.where(
			and(
				eq(canonBooks.bookId, input.bookId),
				ne(canonBooks.canonId, input.canonId),
			),
		);
	const chapterCount = existing?.value ?? 0;
	if (chapterCount > Math.max(input.to, otherCanons?.value ?? 0)) {
		throw new GovernanceError(
			`${input.bookName} already has ${chapterCount} chapters, so its limit can't go down to ${input.to}.`,
		);
	}
}

export const chapterLimitsKind: ChangeKindDefinition<ChapterLimitsPayload> = {
	payload: chapterLimitsPayload,
	decidePermission: "canon.manage",
	title: "Chapter limit change",
	target: ({ canonId }) => ({ type: "canon", id: String(canonId) }),
	destination: ({ canonSlug }) => `/admin/canon?canon=${canonSlug}`,
	async describe(client, { canonId, changes }) {
		const [canon] = await client
			.select({ name: canonTraditions.name })
			.from(canonTraditions)
			.where(eq(canonTraditions.id, canonId));
		const canonName = canon?.name ?? "removed";
		const [first, ...rest] = changes;
		const [book] = first
			? await client
					.select({ name: books.name })
					.from(books)
					.where(eq(books.id, first.bookId))
			: [];
		const others = rest.length > 0 ? ` and ${rest.length} more` : "";
		return `Chapter limit for ${book?.name ?? "a book"}${others} in the ${canonName} canon`;
	},
	async assertAllowed(client, { canonId, changes }) {
		const rows = await client
			.select({
				bookId: canonBooks.bookId,
				limit: canonBooks.chapterLimit,
				name: books.name,
			})
			.from(canonBooks)
			.innerJoin(books, eq(books.id, canonBooks.bookId))
			.where(
				and(
					eq(canonBooks.canonId, canonId),
					inArray(
						canonBooks.bookId,
						changes.map(({ bookId }) => bookId),
					),
				),
			);

		for (const change of changes) {
			const row = rows.find(({ bookId }) => bookId === change.bookId);
			if (!row) {
				throw new GovernanceError("A book here has left this canon.");
			}
			if (row.limit !== change.from) {
				throw new GovernanceError(
					`The limit for ${row.name} has changed since this was proposed. Propose it again from the current number.`,
				);
			}
			await assertChaptersStillFit(client, {
				bookId: change.bookId,
				bookName: row.name,
				canonId,
				to: change.to,
			});
		}
	},
	async apply(client, { canonId, changes }) {
		for (const { bookId, to } of changes) {
			await client
				.update(canonBooks)
				.set({ chapterLimit: to })
				.where(
					and(eq(canonBooks.canonId, canonId), eq(canonBooks.bookId, bookId)),
				);
		}
	},
	proposedAction: "canon_change.proposed",
	decidedAction: canonChangeAction,
};
