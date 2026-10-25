import { queryOptions } from "@tanstack/react-query";

import {
	getPassageOptions,
	getPassageStudyContext,
	getPassageText,
	getPreferredTranslation,
	getVerseRangeText,
	listRecentPassages,
	listTranslations,
} from "@/functions/passages";

import { passageKeys, type VerseRange } from "./keys";

export type { VerseRange } from "./keys";

// Scripture text and reference data do not change while the app is open.
const referenceStaleTime = 60 * 60 * 1000;

export const passageOptionsQueryOptions = () =>
	queryOptions({
		queryKey: passageKeys.options(),
		queryFn: () => getPassageOptions(),
		staleTime: referenceStaleTime,
	});

export const passageStudyContextQueryOptions = (passageId: number) =>
	queryOptions({
		queryKey: passageKeys.studyContext(passageId),
		queryFn: () => getPassageStudyContext({ data: { passageId } }),
		staleTime: referenceStaleTime,
	});

export const passageTextQueryOptions = (
	passageId: number,
	translationId?: number,
) =>
	queryOptions({
		queryKey: passageKeys.text(passageId, translationId),
		queryFn: () => getPassageText({ data: { passageId, translationId } }),
		staleTime: referenceStaleTime,
	});

export const verseRangeTextQueryOptions = (range: VerseRange) =>
	queryOptions({
		queryKey: passageKeys.verseRange(range),
		queryFn: () => getVerseRangeText({ data: range }),
		staleTime: referenceStaleTime,
	});

export const translationsQueryOptions = () =>
	queryOptions({
		queryKey: passageKeys.translations(),
		queryFn: () => listTranslations(),
		staleTime: referenceStaleTime,
	});

export const preferredTranslationQueryOptions = () =>
	queryOptions({
		queryKey: passageKeys.preferredTranslation(),
		queryFn: () => getPreferredTranslation(),
	});

export const recentPassagesQueryOptions = () =>
	queryOptions({
		queryKey: passageKeys.recent(),
		queryFn: () => listRecentPassages(),
	});
