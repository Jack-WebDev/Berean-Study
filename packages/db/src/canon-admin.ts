import { asc, eq, inArray, max } from "drizzle-orm";

import {
	canonBookOrder,
	canonOrderPayload,
	describeOrderChange,
} from "./change-kinds/canon-order";
import { chapterLimitsPayload } from "./change-kinds/chapter-limits";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { user } from "./schema/auth";
import { books } from "./schema/books";
import { canonBooks } from "./schema/canon_books";
import { canonTraditions } from "./schema/canon_traditions";
import { chapters } from "./schema/chapters";
import { bookCatalogue, canonCatalogue } from "./scripture-catalogue";
import { listProposals, proposeChange } from "./two-person";

const catalogueSlugs = bookCatalogue.map(({ slug }) => slug);

async function getCanon(client: DbExecutor, slug: string) {
	const [canon] = await client
		.select()
		.from(canonTraditions)
		.where(eq(canonTraditions.slug, slug));
	if (!canon) throw new GovernanceError("This canon no longer exists.");
	return canon;
}

/** Proposes chapter limits for one canon. Numbers that wouldn't change are left out. */
export async function proposeChapterLimits(
	client: DbExecutor,
	input: {
		actorUserId: string;
		canonSlug: string;
		limits: { bookSlug: string; limit: number }[];
		reason: string;
	},
) {
	const canon = await getCanon(client, input.canonSlug);
	const rows = await client
		.select({
			bookId: canonBooks.bookId,
			limit: canonBooks.chapterLimit,
			slug: books.slug,
		})
		.from(canonBooks)
		.innerJoin(books, eq(books.id, canonBooks.bookId))
		.where(eq(canonBooks.canonId, canon.id));

	const changes = input.limits.flatMap(({ bookSlug, limit }) => {
		const row = rows.find(({ slug }) => slug === bookSlug);
		if (!row) {
			throw new GovernanceError(
				`${bookSlug} isn't in the ${canon.name} canon.`,
			);
		}
		return row.limit === limit
			? []
			: [{ bookId: row.bookId, from: row.limit, to: limit }];
	});
	if (changes.length === 0) {
		throw new GovernanceError("Nothing changes, so there's nothing to send.");
	}

	return proposeChange(client, {
		kind: "chapter_limits",
		payload: { canonId: canon.id, canonSlug: canon.slug, changes },
		proposerUserId: input.actorUserId,
		reason: input.reason,
	});
}

/** Proposes a canon's whole book list, which covers moving, adding and removing books. */
export async function proposeCanonOrder(
	client: DbExecutor,
	input: {
		actorUserId: string;
		canonSlug: string;
		order: string[];
		reason: string;
	},
) {
	if (input.order.length === 0) {
		throw new GovernanceError("A canon needs at least one book.");
	}
	const canon = await getCanon(client, input.canonSlug);
	const rows = await client
		.select({ id: books.id, slug: books.slug })
		.from(books)
		.where(inArray(books.slug, input.order));
	const after = input.order.map((slug) => {
		const row = rows.find((candidate) => candidate.slug === slug);
		if (!row) throw new GovernanceError(`There's no book called ${slug}.`);
		return row.id;
	});

	const before = await canonBookOrder(client, canon.id);
	const { added, moved, removed } = describeOrderChange(before, after);
	if (added.length + moved.length + removed.length === 0) {
		throw new GovernanceError("Nothing changes, so there's nothing to send.");
	}

	return proposeChange(client, {
		kind: "canon_order",
		payload: { after, before, canonId: canon.id, canonSlug: canon.slug },
		proposerUserId: input.actorUserId,
		reason: input.reason,
	});
}

function readPendingChange(
	kind: string,
	payload: unknown,
	bookName: (id: number) => string,
) {
	if (kind === "chapter_limits") {
		const { changes } = chapterLimitsPayload.parse(payload);
		return {
			type: "limits" as const,
			rows: changes.map(({ bookId, from, to }) => ({
				from,
				name: bookName(bookId),
				to,
			})),
		};
	}
	const { after, before } = canonOrderPayload.parse(payload);
	const { added, moved, removed } = describeOrderChange(before, after);
	return {
		type: "order" as const,
		added: added.map(bookName),
		moved: moved.map(({ bookId, from, to }) => ({
			from,
			name: bookName(bookId),
			to,
		})),
		removed: removed.map(bookName),
		size: { after: after.length, before: before.length },
	};
}

/** The four canons, and the books and waiting changes of the chosen one. */
export async function getCanonOverview(
	client: DbExecutor,
	slug: string | undefined,
	viewerUserId: string,
) {
	const canons = await client
		.select()
		.from(canonTraditions)
		.orderBy(asc(canonTraditions.id));
	const ordered = canonCatalogue.flatMap((definition) =>
		canons.filter((canon) => canon.slug === definition.slug),
	);
	const chosen = ordered.find((canon) => canon.slug === slug) ?? ordered[0];
	if (!chosen) return null;

	const memberships = await client
		.select({ canonId: canonBooks.canonId })
		.from(canonBooks);
	const proposals = await listProposals(client, { status: "proposed" });
	const canonProposals = proposals.filter(
		(proposal) => proposal.targetType === "canon",
	);

	const allBooks = await client
		.select({
			group: books.bookGroup,
			id: books.id,
			name: books.name,
			slug: books.slug,
			testament: books.testament,
		})
		.from(books)
		.where(inArray(books.slug, catalogueSlugs));
	const bookName = (id: number) =>
		allBooks.find((book) => book.id === id)?.name ?? "A removed book";

	const rows = await client
		.select({
			bookId: canonBooks.bookId,
			chapterLimit: canonBooks.chapterLimit,
			position: canonBooks.canonicalOrder,
		})
		.from(canonBooks)
		.where(eq(canonBooks.canonId, chosen.id))
		.orderBy(asc(canonBooks.canonicalOrder));
	const chapterCounts = await client
		.select({ bookId: chapters.bookId, value: max(chapters.number) })
		.from(chapters)
		.groupBy(chapters.bookId);

	const selectedBooks = rows.flatMap((row) => {
		const book = allBooks.find(({ id }) => id === row.bookId);
		if (!book) return [];
		return [
			{
				chapterLimit: row.chapterLimit,
				chaptersAdded:
					chapterCounts.find(({ bookId }) => bookId === row.bookId)?.value ?? 0,
				deuterocanonical: book.group === "Deuterocanonical",
				name: book.name,
				position: row.position,
				slug: book.slug,
				testament: book.testament,
			},
		];
	});

	const pendingHere = canonProposals.filter(
		({ targetId }) => targetId === String(chosen.id),
	);
	const proposers = pendingHere.length
		? await client
				.select({ id: user.id, name: user.name })
				.from(user)
				.where(
					inArray(
						user.id,
						pendingHere.map(({ proposerUserId }) => proposerUserId),
					),
				)
		: [];

	return {
		list: ordered.map((canon) => ({
			bookCount: memberships.filter(({ canonId }) => canonId === canon.id)
				.length,
			name: canon.name,
			pendingChanges: canonProposals.filter(
				({ targetId }) => targetId === String(canon.id),
			).length,
			slug: canon.slug,
		})),
		selected: {
			books: selectedBooks,
			name: chosen.name,
			slug: chosen.slug,
		},
		booksOutside: catalogueSlugs.flatMap((candidate) =>
			allBooks
				.filter(
					(book) =>
						book.slug === candidate &&
						!selectedBooks.some(({ slug }) => slug === candidate),
				)
				.map(({ name, slug: bookSlug }) => ({ name, slug: bookSlug })),
		),
		pending: pendingHere.map((proposal) => ({
			change: readPendingChange(proposal.kind, proposal.payload, bookName),
			createdAt: proposal.createdAt,
			description: proposal.description,
			id: proposal.id,
			proposedByMe: proposal.proposerUserId === viewerUserId,
			proposerName:
				proposers.find(({ id }) => id === proposal.proposerUserId)?.name ??
				"Someone",
			reason: proposal.reason,
			title: proposal.title,
		})),
	};
}
