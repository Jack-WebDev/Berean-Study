import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { DbExecutor } from "../db-executor";
import { GovernanceError } from "../governance-error";
import { translations } from "../schema/translations";
import { versePresence } from "../schema/verse_presence";
import { verses } from "../schema/verses";
import {
	translationCatalogue,
	type VersePresenceKind,
	versePresenceKinds,
	versePresenceLabels,
} from "../scripture-catalogue";

/** "own" is a verse with no recorded exception, so it has no row in verse_presence. */
export const translationHandlingSchema = z.array(
	z.object({
		abbreviation: z.string(),
		kind: z.enum(["own", ...versePresenceKinds]),
		includedInVerse: z.number().int().positive().nullish(),
	}),
);

export type TranslationHandling = z.infer<
	typeof translationHandlingSchema
>[number];

export function isOwnVerse(kind: TranslationHandling["kind"]) {
	return kind === "own" || kind === "bracketed";
}

export function handlingLabel(handling: TranslationHandling, ownLabel: string) {
	if (handling.kind === "own") return ownLabel;
	if (handling.kind === "included_in") {
		return `Included in verse ${handling.includedInVerse}`;
	}
	return versePresenceLabels[handling.kind as VersePresenceKind];
}

export function assertAllSixAnswered(handling: readonly TranslationHandling[]) {
	const answered = new Set(handling.map(({ abbreviation }) => abbreviation));
	const complete =
		handling.length === translationCatalogue.length &&
		translationCatalogue.every(({ abbreviation }) =>
			answered.has(abbreviation),
		);
	if (!complete) {
		throw new GovernanceError("Answer for all six translations.");
	}
}

/** Replaces how every translation handles one verse. */
export async function writeHandling(
	client: DbExecutor,
	input: {
		chapterId: number;
		handling: readonly TranslationHandling[];
		verseId: number;
	},
) {
	await client
		.delete(versePresence)
		.where(eq(versePresence.verseId, input.verseId));

	for (const { abbreviation, includedInVerse, kind } of input.handling) {
		if (kind === "own") continue;
		const [translation] = await client
			.select({ id: translations.id })
			.from(translations)
			.where(eq(translations.abbreviation, abbreviation));
		if (!translation) {
			throw new GovernanceError(`${abbreviation} isn't supported.`);
		}
		const [included] = includedInVerse
			? await client
					.select({ id: verses.id })
					.from(verses)
					.where(
						and(
							eq(verses.chapterId, input.chapterId),
							eq(verses.number, includedInVerse),
						),
					)
			: [];
		await client.insert(versePresence).values({
			includedInVerseId: included?.id ?? null,
			kind,
			translationId: translation.id,
			verseId: input.verseId,
		});
	}
}

/** Refuses an "included in" answer that doesn't point at a real, different verse. */
export function assertIncludedVersesValid(
	handling: readonly TranslationHandling[],
	input: { existing: ReadonlySet<number>; verse?: number },
) {
	for (const { abbreviation, includedInVerse, kind } of handling) {
		if (kind !== "included_in") continue;
		if (!includedInVerse) {
			throw new GovernanceError(
				`Say which verse includes it in ${abbreviation}.`,
			);
		}
		if (includedInVerse === input.verse) {
			throw new GovernanceError(
				`A verse can't be included in itself, as ${abbreviation} says here.`,
			);
		}
		if (!input.existing.has(includedInVerse)) {
			throw new GovernanceError(
				`${abbreviation} can't be included in verse ${includedInVerse}, which doesn't exist in this chapter.`,
			);
		}
	}
}
