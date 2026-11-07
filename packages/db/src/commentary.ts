import { randomUUID } from "node:crypto";

import { and, between, count, eq, like, ne } from "drizzle-orm";
import {
	type CommentaryKind,
	type CommentaryScope,
	commentaryKindLabels,
	commentaryKinds,
	commentaryScopeKey,
	parseCommentaryScopeKey,
	rangesOverlap,
	startingCommentaryBody,
} from "./commentary-body";
import { commentaryScopeLabel } from "./commentary-kinds";
import { getContentState, listContentRecords } from "./content-queues";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { books } from "./schema/books";
import { chapters } from "./schema/chapters";
import { contentItems } from "./schema/content_items";
import { verses } from "./schema/verses";
import {
	resolvePassage,
	resolveScriptureReference,
	splitScriptureReference,
} from "./scripture-reference";

async function bookSlugFor(client: DbExecutor, bookId: number) {
	const [book] = await client
		.select({ slug: books.slug })
		.from(books)
		.where(eq(books.id, bookId));
	if (!book) throw new GovernanceError("This book no longer exists.");
	return book.slug;
}

function requireVerse(
	text: string,
	point: { chapter: number; verse: number | null } | undefined,
) {
	if (!point || point.verse === null) {
		throw new GovernanceError(
			`Include the verse in "${text}", like Romans 8:18.`,
		);
	}
	return { chapter: point.chapter, verse: point.verse };
}

/**
 * Turns what a writer typed into the verses a commentary covers. The same verses
 * always give the same key, so starting one that exists opens it instead.
 */
export async function resolveCommentaryScope(
	client: DbExecutor,
	input: { from?: string; kind: CommentaryKind; to?: string },
) {
	const fromText = input.from?.trim() ?? "";
	if (!fromText) {
		throw new GovernanceError(
			input.kind === "book_introduction"
				? "Choose a book."
				: "Say which verses this covers.",
		);
	}
	const { bookId } = await resolveScriptureReference(client, fromText);
	const bookSlug = await bookSlugFor(client, bookId);
	const first = splitScriptureReference(fromText)?.range;

	let scope: CommentaryScope;
	if (input.kind === "book_introduction") {
		scope = { bookSlug, kind: input.kind };
	} else {
		const from = requireVerse(fromText, first?.from);
		let to = from;
		if (input.kind === "passage_commentary") {
			const toText = input.to?.trim() ?? "";
			if (!toText) throw new GovernanceError("Say which verse this runs to.");
			// "30" or "8:30" is enough. The book carries over from the first verse.
			const bare = /^\d+$/.test(toText)
				? `${from.chapter}:${toText}`
				: /^\d/.test(toText)
					? toText
					: null;
			if (bare) {
				const [chapterText, verseText] = bare.split(":");
				to = requireVerse(toText, {
					chapter: Number(chapterText),
					verse: verseText ? Number(verseText) : null,
				});
			} else {
				const { bookId: toBook } = await resolveScriptureReference(
					client,
					toText,
				);
				if (toBook !== bookId) {
					throw new GovernanceError(
						"A passage commentary stays within one book.",
					);
				}
				to = requireVerse(toText, splitScriptureReference(toText)?.range?.to);
			}
			if (
				to.chapter < from.chapter ||
				(to.chapter === from.chapter && to.verse <= from.verse)
			) {
				throw new GovernanceError(
					"The last verse has to come after the first. For one verse, use Verse commentary.",
				);
			}
			await resolveScriptureReference(
				client,
				`${await bookNameFor(client, bookId)} ${to.chapter}:${to.verse}`,
			);
		}
		scope = { bookSlug, from, kind: input.kind, to };
	}
	return { kind: input.kind, scopeKey: commentaryScopeKey(scope) };
}

async function bookNameFor(client: DbExecutor, bookId: number) {
	const [book] = await client
		.select({ name: books.name })
		.from(books)
		.where(eq(books.id, bookId));
	return book?.name ?? "";
}

/** How many verses are entered in each chapter of this range, where any are. */
async function verseCountsFor(
	client: DbExecutor,
	bookSlug: string,
	fromChapter: number,
	toChapter: number,
) {
	const rows = await client
		.select({ chapter: chapters.number, value: count(verses.id) })
		.from(chapters)
		.innerJoin(books, eq(books.id, chapters.bookId))
		.innerJoin(verses, eq(verses.chapterId, chapters.id))
		.where(
			and(
				eq(books.slug, bookSlug),
				between(chapters.number, fromChapter, toChapter),
			),
		)
		.groupBy(chapters.number);
	return Object.fromEntries(rows.map(({ chapter, value }) => [chapter, value]));
}

/** Other passage commentaries sharing some of these verses. Allowed, but worth knowing. */
async function overlappingCommentaries(
	client: DbExecutor,
	scope: CommentaryScope,
	scopeKey: string,
) {
	if (scope.kind !== "passage_commentary") return [];
	const rows = await client
		.select({ scopeKey: contentItems.scopeKey, title: contentItems.title })
		.from(contentItems)
		.where(
			and(
				eq(contentItems.kind, scope.kind),
				like(contentItems.scopeKey, `${scope.bookSlug}:%`),
				ne(contentItems.scopeKey, scopeKey),
			),
		);
	return rows.flatMap((row) => {
		const other = parseCommentaryScopeKey(scope.kind, row.scopeKey);
		if (!other || other.kind === "book_introduction") return [];
		return rangesOverlap(scope, other) ? [row] : [];
	});
}

/** Everything the commentary editor needs. Null if the address doesn't describe real verses. */
export async function getCommentaryEditor(
	client: DbExecutor,
	input: { kind: CommentaryKind; scopeKey: string },
	viewerUserId: string,
) {
	const scope = parseCommentaryScopeKey(input.kind, input.scopeKey);
	if (!scope) return null;
	const [book] = await client
		.select({ id: books.id })
		.from(books)
		.where(eq(books.slug, scope.bookSlug));
	if (!book) return null;

	const { bookName, label } = await commentaryScopeLabel(
		client,
		input.kind,
		input.scopeKey,
	);
	const state = await getContentState(client, input, viewerUserId);
	return {
		body:
			state.body.sections.length > 0
				? state.body
				: startingCommentaryBody(input.kind, bookName, randomUUID),
		bookName,
		kind: input.kind,
		kindLabel: commentaryKindLabels[input.kind],
		overlaps: await overlappingCommentaries(client, scope, input.scopeKey),
		scope,
		scopeKey: input.scopeKey,
		scopeLabel: label,
		state,
		verseCounts:
			scope.kind === "book_introduction"
				? {}
				: await verseCountsFor(
						client,
						scope.bookSlug,
						scope.from.chapter,
						scope.to.chapter,
					),
	};
}

/** Commentary that already exists, so people can find it to revise it. */
export async function listCommentaries(
	client: DbExecutor,
	filter: { search?: string } = {},
) {
	const rows = await listContentRecords(client, {
		kinds: commentaryKinds,
		search: filter.search,
	});
	return rows.map((row) => ({ ...row, kind: row.kind as CommentaryKind }));
}

/** Checks a typed reference and writes it in full, ready to insert: "Rom 8:31" becomes "Romans 8:31". */
export async function resolveEditorReference(client: DbExecutor, text: string) {
	const { label, passage } = await resolvePassage(client, text);
	return { bookSlug: passage.bookSlug, label };
}
