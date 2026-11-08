import { type QueryClient, queryOptions } from "@tanstack/react-query";

import {
	getAboutBook,
	getBookPage,
	getChapterMarks,
	getContinueReading,
	getReaderChapter,
	getReadingPlace,
	getReadingPreferences,
	getVerseStudy,
	getVerseWords,
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
	type VerseStudyInput,
	type VerseWordsInput,
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

export const bookPageQueryOptions = (bookSlug: string) =>
	queryOptions({
		queryKey: readerKeys.book(bookSlug),
		queryFn: () => getBookPage({ data: { bookSlug } }),
	});

/** Book overviews and introductions change only when staff publish. */
export const aboutBookQueryOptions = (bookSlug: string) =>
	queryOptions({
		queryKey: readerKeys.about(bookSlug),
		queryFn: () => getAboutBook({ data: { bookSlug } }),
		staleTime: scriptureStaleTime,
	});

export const continueReadingQueryOptions = () =>
	queryOptions({
		queryKey: readerKeys.continueReading(),
		queryFn: () => getContinueReading(),
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

export const verseWordsQueryOptions = (input: VerseWordsInput) =>
	queryOptions({
		queryKey: readerKeys.verseWords(input),
		queryFn: () => getVerseWords({ data: input }),
		staleTime: scriptureStaleTime,
	});

/** Study notes change only when staff publish, so they're kept like Scripture. */
export const verseStudyQueryOptions = (input: VerseStudyInput) =>
	queryOptions({
		queryKey: readerKeys.study(input),
		queryFn: () => getVerseStudy({ data: input }),
		staleTime: scriptureStaleTime,
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
		queryClient.invalidateQueries({ queryKey: readerKeys.allBooks() }),
		queryClient.invalidateQueries({ queryKey: readerKeys.recentChapters() }),
		queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
	]);
}
