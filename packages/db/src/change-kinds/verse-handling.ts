import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { DbExecutor } from "../db-executor";
import { GovernanceError } from "../governance-error";
import { books } from "../schema/books";
import { verses } from "../schema/verses";
import { listSupportedTranslations } from "../translations-admin";
import type { ChangeKindDefinition } from "../two-person";
import { loadChapterVerses } from "../verse-text-rows";
import {
	assertAllSixAnswered,
	assertIncludedVersesValid,
	isOwnVerse,
	type TranslationHandling,
	translationHandlingSchema,
	writeHandling,
} from "./translation-handling";
import {
	chapterVerseNumbers,
	structureChangeAction,
	structureChapter,
} from "./verse-addition";

export const verseHandlingPayload = z.object({
	bookSlug: z.string(),
	chapter: z.number().int().positive(),
	verse: z.number().int().positive(),
	/** How it stood when proposed, so a stale proposal can't undo a newer decision. */
	before: translationHandlingSchema,
	after: translationHandlingSchema,
});

export type VerseHandlingPayload = z.infer<typeof verseHandlingPayload>;

/** How each translation handles a verse now, and whether it holds any text. */
export async function currentVerseHandling(
	client: DbExecutor,
	input: { bookSlug: string; chapter: number; verse: number },
) {
	const { chapter } = await structureChapter(
		client,
		input.bookSlug,
		input.chapter,
	);
	const rows = [];
	for (const translation of await listSupportedTranslations(client)) {
		const chapterVerses = await loadChapterVerses(
			client,
			chapter.id,
			translation.id,
		);
		const verse = chapterVerses.find(({ number }) => number === input.verse);
		if (!verse) {
			throw new GovernanceError("This verse no longer exists.");
		}
		rows.push({
			abbreviation: translation.abbreviation,
			hasText: verse.status !== "empty",
			includedInVerse: verse.includedInVerse,
			kind: verse.presenceKind ?? ("own" as const),
		});
	}
	return { chapterId: chapter.id, rows };
}

export function sameHandling(
	a: readonly TranslationHandling[],
	b: readonly TranslationHandling[],
) {
	return a.every((left) => {
		const right = b.find(
			({ abbreviation }) => abbreviation === left.abbreviation,
		);
		return (
			right?.kind === left.kind &&
			(right.includedInVerse ?? null) === (left.includedInVerse ?? null)
		);
	});
}

export const verseHandlingKind: ChangeKindDefinition<VerseHandlingPayload> = {
	payload: verseHandlingPayload,
	decidePermission: "scripture.manage",
	title: "Structure change",
	target: ({ bookSlug, chapter }) => ({
		type: "chapter_reference",
		id: `${bookSlug}.${chapter}`,
	}),
	destination: () => "/admin/canon",
	async describe(client, { bookSlug, chapter, verse }) {
		const [book] = await client
			.select({ name: books.name })
			.from(books)
			.where(eq(books.slug, bookSlug));
		return `How translations handle ${book?.name ?? bookSlug} ${chapter}:${verse}`;
	},
	async assertAllowed(client, payload) {
		const current = await currentVerseHandling(client, payload);
		if (!sameHandling(payload.before, current.rows)) {
			throw new GovernanceError(
				"This verse has changed since this was proposed. Propose it again from how it stands now.",
			);
		}
		assertAllSixAnswered(payload.after);
		assertIncludedVersesValid(payload.after, {
			existing: new Set(await chapterVerseNumbers(client, current.chapterId)),
			verse: payload.verse,
		});
		for (const { abbreviation, kind } of payload.after) {
			const holdsText = current.rows.find(
				(row) => row.abbreviation === abbreviation,
			)?.hasText;
			if (!isOwnVerse(kind) && holdsText) {
				throw new GovernanceError(
					`${abbreviation} already has text for this verse, so it can't stop having a verse of its own.`,
				);
			}
		}
	},
	async apply(client, payload) {
		const { chapter } = await structureChapter(
			client,
			payload.bookSlug,
			payload.chapter,
		);
		const [verse] = await client
			.select({ id: verses.id })
			.from(verses)
			.where(
				and(eq(verses.chapterId, chapter.id), eq(verses.number, payload.verse)),
			);
		if (!verse) throw new GovernanceError("This verse no longer exists.");
		await writeHandling(client, {
			chapterId: chapter.id,
			handling: payload.after,
			verseId: verse.id,
		});
	},
	proposedAction: "structure_change.proposed",
	decidedAction: structureChangeAction,
};
