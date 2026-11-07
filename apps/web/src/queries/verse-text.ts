import { type QueryClient, queryOptions } from "@tanstack/react-query";

import {
	getEntryChapter,
	getVerseAcrossTranslations,
	listEntryTraditions,
} from "@/functions/verse-entry";
import {
	getProofreadingChapter,
	listChaptersReadyToPublish,
	listProofreadingQueue,
} from "@/functions/verse-proofreading";

import {
	auditKeys,
	type EntryChapterInput,
	type ProofreadingChapterInput,
	scriptureDataKeys,
	staffQueueKeys,
	type VerseAcrossTranslationsInput,
	verseTextKeys,
} from "./keys";

export const entryChapterQueryOptions = (input: EntryChapterInput) =>
	queryOptions({
		queryKey: verseTextKeys.entry(input),
		queryFn: () => getEntryChapter({ data: input }),
	});

export const entryTraditionsQueryOptions = () =>
	queryOptions({
		queryKey: verseTextKeys.entryTraditions(),
		queryFn: () => listEntryTraditions(),
	});

export const proofreadingChapterQueryOptions = (
	input: ProofreadingChapterInput,
) =>
	queryOptions({
		queryKey: verseTextKeys.proofreading(input),
		queryFn: () => getProofreadingChapter({ data: input }),
	});

export const proofreadingQueueQueryOptions = () =>
	queryOptions({
		queryKey: verseTextKeys.queue(),
		queryFn: () => listProofreadingQueue(),
	});

export const readyToPublishQueryOptions = () =>
	queryOptions({
		queryKey: verseTextKeys.readyToPublish(),
		queryFn: () => listChaptersReadyToPublish(),
	});

export const verseAcrossTranslationsQueryOptions = (
	input: VerseAcrossTranslationsInput,
) =>
	queryOptions({
		queryKey: verseTextKeys.verse(input),
		queryFn: () => getVerseAcrossTranslations({ data: input }),
	});

/** Moving verse text along changes queues, progress and the audit log too. */
export function invalidateVerseText(queryClient: QueryClient) {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: verseTextKeys.all }),
		queryClient.invalidateQueries({ queryKey: scriptureDataKeys.all }),
		queryClient.invalidateQueries({ queryKey: staffQueueKeys.all }),
		queryClient.invalidateQueries({ queryKey: auditKeys.all }),
	]);
}
