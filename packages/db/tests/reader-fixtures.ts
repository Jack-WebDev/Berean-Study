import { eq } from "drizzle-orm";

import type { DbExecutor } from "../src/db-executor";
import { books } from "../src/schema/books";
import { chapters } from "../src/schema/chapters";
import { contentItems } from "../src/schema/content_items";
import { contentPassages } from "../src/schema/content_passages";
import { contentRevisions } from "../src/schema/content_revisions";
import { translations } from "../src/schema/translations";
import { verseTexts } from "../src/schema/verse_texts";
import { verses } from "../src/schema/verses";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import {
	createAccount,
	inRolledBackTransactionWithoutScripture,
} from "./governance-helpers";

/*
 * Shared setup for the reader's tests: published verses, and reviewed content
 * published the way the review process leaves it.
 */

export async function publish(
	tx: DbExecutor,
	bookSlug: string,
	chapterNumber: number,
	texts: Record<number, string>,
) {
	const [translation] = await tx
		.select({
			id: translations.id,
			versificationSystemId: translations.versificationSystemId,
		})
		.from(translations)
		.where(eq(translations.abbreviation, "KJV"));
	const [book] = await tx
		.select({ id: books.id })
		.from(books)
		.where(eq(books.slug, bookSlug));
	if (!translation || !book) throw new Error("Missing catalogue rows.");
	const [chapter] = await tx
		.insert(chapters)
		.values({
			bookId: book.id,
			number: chapterNumber,
			versificationSystemId: translation.versificationSystemId,
		})
		.returning({ id: chapters.id });
	if (!chapter) throw new Error("No chapter");
	for (const [number, text] of Object.entries(texts)) {
		const [verse] = await tx
			.insert(verses)
			.values({ chapterId: chapter.id, number: Number(number) })
			.returning({ id: verses.id });
		if (!verse) throw new Error("No verse");
		await tx
			.insert(verseTexts)
			.values({ text, translationId: translation.id, verseId: verse.id });
	}
	return book.id;
}

export type Setup = {
	bookId: (slug: string) => Promise<number>;
	reviewerId: string;
	tx: DbExecutor;
	writerId: string;
};

/**
 * Adds reviewed content the way publishing leaves it. `live: false` leaves it
 * as a draft, which readers never see.
 */
export async function addContent(
	{ reviewerId, tx, writerId }: Setup,
	input: {
		body: unknown;
		kind: string;
		live?: boolean;
		passages: Array<{
			bookId: number;
			from: [chapter: number, verse: number];
			showsToReaders?: boolean;
			to: [chapter: number, verse: number];
		}>;
		scopeKey: string;
		title?: string;
	},
) {
	const live = input.live ?? true;
	const [item] = await tx
		.insert(contentItems)
		.values({
			kind: input.kind,
			scopeKey: input.scopeKey,
			title: input.title ?? "Staff title",
		})
		.returning({ id: contentItems.id });
	if (!item) throw new Error("No item");
	const now = new Date();
	const [revision] = await tx
		.insert(contentRevisions)
		.values({
			body: input.body,
			contentItemId: item.id,
			createdByUserId: writerId,
			number: 1,
			...(live
				? {
						approvedAt: now,
						publishedAt: now,
						publishedByUserId: reviewerId,
						reviewerUserId: reviewerId,
						status: "published" as const,
					}
				: {}),
		})
		.returning({ id: contentRevisions.id });
	if (!revision) throw new Error("No revision");
	if (input.passages.length > 0)
		await tx.insert(contentPassages).values(
			input.passages.map((passage, index) => ({
				bookId: passage.bookId,
				contentRevisionId: revision.id,
				fromChapter: passage.from[0],
				fromVerse: passage.from[1],
				position: index + 1,
				showsToReaders: passage.showsToReaders ?? true,
				toChapter: passage.to[0],
				toVerse: passage.to[1],
			})),
		);
	if (live) {
		await tx
			.update(contentItems)
			.set({ liveRevisionId: revision.id })
			.where(eq(contentItems.id, item.id));
	}
	return { contentItemId: item.id, revisionId: revision.id };
}

export function inStudy(test: (setup: Setup) => Promise<void>) {
	return inRolledBackTransactionWithoutScripture(async (tx) => {
		await applyScriptureCatalogue(tx);
		const writer = await createAccount(tx);
		const reviewer = await createAccount(tx);
		await test({
			bookId: async (slug) => {
				const [book] = await tx
					.select({ id: books.id })
					.from(books)
					.where(eq(books.slug, slug));
				if (!book) throw new Error(`No book ${slug}`);
				return book.id;
			},
			reviewerId: reviewer.id,
			tx,
			writerId: writer.id,
		});
	});
}

export const paragraph = (...content: unknown[]) => ({
	content: [{ content, type: "paragraph" }],
	type: "doc",
});
export const text = (words: string) => ({ text: words, type: "text" });
