import { type QueryClient, queryOptions } from "@tanstack/react-query";

import {
	getChapterMarks,
	getReaderChapter,
	getReadingPlace,
	getReadingPreferences,
	listAvailableChapters,
	listCanonBooks,
	listReaderTranslations,
	listRecentChapters,
} from "@/functions/reader";

import {
	type ChapterMarksInput,
	libraryKeys,
	type ReaderChapterInput,
	readerKeys,
} from "./keys";

// Published text only changes when staff publish a chapter, which is rare.
const scriptureStaleTime = 60 * 60 * 1000;

export const readerChapterQueryOptions = (input: ReaderChapterInput) =>
	queryOptions({
		queryKey: readerKeys.chapter(input),
		queryFn: () => getReaderChapter({ data: input }),
		staleTime: scriptureStaleTime,
	});

export const availableChaptersQueryOptions = (
	bookSlug: string,
	translationAbbreviation: string,
) =>
	queryOptions({
		queryKey: readerKeys.availableChapters(bookSlug, translationAbbreviation),
		queryFn: () =>
			listAvailableChapters({ data: { bookSlug, translationAbbreviation } }),
		staleTime: scriptureStaleTime,
	});

export const canonBooksQueryOptions = () =>
	queryOptions({
		queryKey: readerKeys.books(),
		queryFn: () => listCanonBooks(),
		staleTime: scriptureStaleTime,
	});

export const readerTranslationsQueryOptions = () =>
	queryOptions({
		queryKey: readerKeys.translations(),
		queryFn: () => listReaderTranslations(),
		staleTime: scriptureStaleTime,
	});

export const chapterMarksQueryOptions = (input: ChapterMarksInput) =>
	queryOptions({
		queryKey: readerKeys.marks(input),
		queryFn: () => getChapterMarks({ data: input }),
	});

export const readingPreferencesQueryOptions = () =>
	queryOptions({
		queryKey: readerKeys.preferences(),
		queryFn: () => getReadingPreferences(),
	});

export const readingPlaceQueryOptions = () =>
	queryOptions({
		queryKey: readerKeys.place(),
		queryFn: () => getReadingPlace(),
	});

export const recentChaptersQueryOptions = () =>
	queryOptions({
		queryKey: readerKeys.recentChapters(),
		queryFn: () => listRecentChapters(),
	});

/**
 * Changing the tradition or translation changes which books and chapters show,
 * so everything the reader has loaded is refreshed.
 */
export function invalidateReader(queryClient: QueryClient) {
	return queryClient.invalidateQueries({ queryKey: readerKeys.all });
}

/** Highlights, notes and saves change the marks beside verses and the Saved page. */
export function invalidateReaderMarks(queryClient: QueryClient) {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: readerKeys.allMarks() }),
		queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
	]);
}

/** Moving through the Bible changes Continue reading on Home and Library. */
export function invalidateReadingPlace(queryClient: QueryClient) {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: readerKeys.place() }),
		queryClient.invalidateQueries({ queryKey: readerKeys.recentChapters() }),
		queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
	]);
}
