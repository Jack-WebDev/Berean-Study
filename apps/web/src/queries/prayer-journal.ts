import { type QueryClient, queryOptions } from "@tanstack/react-query";

import {
	getPrayerJournalCounts,
	getReflectionReminder,
} from "@/functions/prayer-journal";

import {
	libraryKeys,
	prayerJournalKeys,
	prayerKeys,
	reflectionKeys,
	testimonyKeys,
} from "./keys";

export const prayerJournalCountsQueryOptions = () =>
	queryOptions({
		queryKey: prayerJournalKeys.counts(),
		queryFn: () => getPrayerJournalCounts(),
	});

export const reflectionReminderQueryOptions = () =>
	queryOptions({
		queryKey: prayerJournalKeys.reflectionReminder(),
		queryFn: () => getReflectionReminder(),
	});

/**
 * Refreshes everything a journal entry appears in. A saved reflection changes
 * its prayer's "ready to look back on" status and every tab count, so one
 * save refreshes all three tabs and the library summaries.
 */
export function invalidatePrayerJournal(queryClient: QueryClient) {
	return Promise.all(
		[
			prayerKeys.all,
			reflectionKeys.all,
			testimonyKeys.all,
			prayerJournalKeys.all,
			libraryKeys.all,
		].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
	);
}
