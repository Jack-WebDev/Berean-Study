import { useQuery } from "@tanstack/react-query";

import type {
	getPassageOptions,
	getPassageText,
	listTranslations,
} from "@/functions/passages";
import { notesQueryOptions, noteTagsQueryOptions } from "@/queries/notes";
import {
	passageOptionsQueryOptions,
	passageStudyContextQueryOptions,
	passageTextQueryOptions,
	preferredTranslationQueryOptions,
	recentPassagesQueryOptions,
	translationsQueryOptions,
} from "@/queries/passages";

export type PassageOption = Awaited<
	ReturnType<typeof getPassageOptions>
>[number];
export type PassageText = NonNullable<
	Awaited<ReturnType<typeof getPassageText>>
>;
export type Translation = Awaited<ReturnType<typeof listTranslations>>[number];

export function usePassageOptions() {
	return useQuery(passageOptionsQueryOptions());
}

export function useTranslations() {
	return useQuery(translationsQueryOptions());
}

export function usePreferredTranslation() {
	return useQuery(preferredTranslationQueryOptions());
}

export function useRecentPassages() {
	return useQuery(recentPassagesQueryOptions());
}

export function useNoteTagSuggestions() {
	return useQuery(noteTagsQueryOptions());
}

/** Passage text in a translation; the member's preferred one when unset. */
export function usePassageText(
	passageId: number | null,
	translationId: number | null,
) {
	return useQuery({
		...passageTextQueryOptions(passageId ?? 0, translationId ?? undefined),
		enabled: passageId !== null,
	});
}

export function useRelatedPassages(passageId: number | null) {
	return useQuery({
		...passageStudyContextQueryOptions(passageId ?? 0),
		enabled: passageId !== null,
		select: (context) => context?.relatedPassages ?? [],
	});
}

export function useNotesForPassage(passageId: number | null) {
	return useQuery({
		...notesQueryOptions({ passageId: passageId ?? 0 }),
		enabled: passageId !== null,
	});
}

/** Case-insensitive match on every word of the query, capped for display. */
export function filterPassageOptions(
	passages: readonly PassageOption[],
	query: string,
	limit = 8,
) {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return [];
	return passages
		.filter((passage) => {
			const label = passage.label.toLowerCase();
			return words.every((word) => label.includes(word));
		})
		.slice(0, limit);
}
