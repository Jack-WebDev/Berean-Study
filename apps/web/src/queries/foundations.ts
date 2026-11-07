import { type QueryClient, queryOptions } from "@tanstack/react-query";

import { getCanonOverview } from "@/functions/canon";
import {
	getStructureChange,
	getVerseHandling,
	listStructureChanges,
} from "@/functions/structure";

import {
	auditKeys,
	foundationKeys,
	scriptureDataKeys,
	staffQueueKeys,
	type VerseHandlingInput,
	verseTextKeys,
} from "./keys";

export const canonOverviewQueryOptions = (slug?: string) =>
	queryOptions({
		queryKey: foundationKeys.canon(slug),
		queryFn: () => getCanonOverview({ data: { slug } }),
	});

export const structureChangesQueryOptions = () =>
	queryOptions({
		queryKey: foundationKeys.structureChanges(),
		queryFn: () => listStructureChanges(),
	});

export const structureChangeQueryOptions = (id: number) =>
	queryOptions({
		queryKey: foundationKeys.structureChange(id),
		queryFn: () => getStructureChange({ data: { id } }),
	});

export const verseHandlingQueryOptions = (input: VerseHandlingInput) =>
	queryOptions({
		queryKey: foundationKeys.verseHandling(input),
		queryFn: () => getVerseHandling({ data: input }),
	});

/** Confirming a change can alter the chapters, limits and queues other screens show. */
export function invalidateFoundations(queryClient: QueryClient) {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: foundationKeys.all }),
		queryClient.invalidateQueries({ queryKey: scriptureDataKeys.all }),
		queryClient.invalidateQueries({ queryKey: verseTextKeys.all }),
		queryClient.invalidateQueries({ queryKey: staffQueueKeys.all }),
		queryClient.invalidateQueries({ queryKey: auditKeys.all }),
	]);
}
