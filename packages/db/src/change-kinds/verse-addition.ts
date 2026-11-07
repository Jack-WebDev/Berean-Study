import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import type { DbExecutor } from "../db-executor";
import { GovernanceError } from "../governance-error";
import { books } from "../schema/books";
import { verses } from "../schema/verses";
import { translationCatalogue } from "../scripture-catalogue";
import type { ChangeDecision, ChangeKindDefinition } from "../two-person";
import { resolveChapter } from "../verse-text-rows";
import { HIGHEST_VERSE_NUMBER } from "../verse-text-tools";
import {
	assertAllSixAnswered,
	assertIncludedVersesValid,
	translationHandlingSchema,
	writeHandling,
} from "./translation-handling";

export const verseAdditionPayload = z.object({
	bookSlug: z.string(),
	chapter: z.number().int().positive(),
	firstVerse: z.number().int().positive(),
	lastVerse: z.number().int().positive(),
	handling: translationHandlingSchema,
});

export type VerseAdditionPayload = z.infer<typeof verseAdditionPayload>;

export function structureChangeAction(decision: ChangeDecision) {
	if (decision === "confirm") return "structure_change.confirmed" as const;
	return decision === "return"
		? ("structure_change.returned" as const)
		: ("structure_change.rejected" as const);
}

/** Chapters are shared by all six translations, so any of them can find one. */
export function structureChapter(
	client: DbExecutor,
	bookSlug: string,
	chapter: number,
) {
	const abbreviation = translationCatalogue[0]?.abbreviation ?? "";
	return resolveChapter(client, { abbreviation, chapter, slug: bookSlug });
}

export async function chapterVerseNumbers(
	client: DbExecutor,
	chapterId: number,
) {
	const rows = await client
		.select({ number: verses.number })
		.from(verses)
		.where(eq(verses.chapterId, chapterId))
		.orderBy(desc(verses.number));
	return rows.map(({ number }) => number);
}

export function verseAdditionReference(
	bookName: string,
	{ chapter, firstVerse, lastVerse }: VerseAdditionPayload,
) {
	return firstVerse === lastVerse
		? `${bookName} ${chapter}:${firstVerse}`
		: `${bookName} ${chapter}:${firstVerse}–${lastVerse}`;
}

export const verseAdditionKind: ChangeKindDefinition<VerseAdditionPayload> = {
	payload: verseAdditionPayload,
	decidePermission: "scripture.manage",
	title: "Structure change",
	target: ({ bookSlug, chapter }) => ({
		type: "chapter_reference",
		id: `${bookSlug}.${chapter}`,
	}),
	destination: () => "/admin/canon",
	async describe(client, payload) {
		const [book] = await client
			.select({ name: books.name })
			.from(books)
			.where(eq(books.slug, payload.bookSlug));
		const noun = payload.firstVerse === payload.lastVerse ? "verse" : "verses";
		return `Adding ${noun} ${verseAdditionReference(book?.name ?? payload.bookSlug, payload)}`;
	},
	async assertAllowed(client, payload) {
		const { chapter } = await structureChapter(
			client,
			payload.bookSlug,
			payload.chapter,
		);
		const numbers = await chapterVerseNumbers(client, chapter.id);
		if (payload.firstVerse !== (numbers[0] ?? 0) + 1) {
			throw new GovernanceError(
				"This chapter has changed since this was proposed, and verses can only be added at the end. Propose it again.",
			);
		}
		if (
			payload.lastVerse < payload.firstVerse ||
			payload.lastVerse > HIGHEST_VERSE_NUMBER
		) {
			throw new GovernanceError(
				`Verses have to run forward from ${payload.firstVerse}, and no chapter goes past verse ${HIGHEST_VERSE_NUMBER}.`,
			);
		}
		assertAllSixAnswered(payload.handling);
		assertIncludedVersesValid(payload.handling, {
			existing: new Set(numbers),
		});
	},
	async apply(client, payload) {
		const { chapter } = await structureChapter(
			client,
			payload.bookSlug,
			payload.chapter,
		);
		for (
			let number = payload.firstVerse;
			number <= payload.lastVerse;
			number += 1
		) {
			const [verse] = await client
				.insert(verses)
				.values({ chapterId: chapter.id, number })
				.returning({ id: verses.id });
			if (!verse) throw new Error("Could not add the verse.");
			await writeHandling(client, {
				chapterId: chapter.id,
				handling: payload.handling,
				verseId: verse.id,
			});
		}
	},
	proposedAction: "structure_change.proposed",
	decidedAction: structureChangeAction,
};
