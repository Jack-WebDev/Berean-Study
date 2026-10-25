import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LibraryPage } from "@/components/library/library-page";
import {
	continueReadingQueryOptions,
	libraryDestinationCountsQueryOptions,
	recentLibraryActivityQueryOptions,
	recentlyStudiedQueryOptions,
} from "@/queries/library";

export const Route = createFileRoute("/_auth/library/")({
	component: LibraryRoute,
	// Load all four sections before the page opens. If one fails, the page
	// still opens and that section shows its own error message.
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.query(continueReadingQueryOptions()).catch(ignoreError),
			queryClient
				.query(libraryDestinationCountsQueryOptions())
				.catch(ignoreError),
			queryClient.query(recentLibraryActivityQueryOptions()).catch(ignoreError),
			queryClient.query(recentlyStudiedQueryOptions()).catch(ignoreError),
		]),
	pendingComponent: LibraryLoadingRoute,
});

function LibraryRoute() {
	const continueReading = useQuery(continueReadingQueryOptions());
	const destinationCounts = useQuery(libraryDestinationCountsQueryOptions());
	const recentActivity = useQuery(recentLibraryActivityQueryOptions());
	const recentlyStudied = useQuery(recentlyStudiedQueryOptions());

	return (
		<LibraryPage
			continueReading={toSectionState(continueReading, (reading) => reading)}
			destinationCounts={toSectionState(destinationCounts, (counts) => ({
				counts,
			}))}
			recentActivity={toSectionState(recentActivity, (items) => ({ items }))}
			recentlyStudied={toSectionState(recentlyStudied, (items) => ({ items }))}
		/>
	);
}

function LibraryLoadingRoute() {
	return (
		<LibraryPage
			continueReading={{ status: "loading" }}
			destinationCounts={{ status: "loading" }}
			recentActivity={{ status: "loading" }}
			recentlyStudied={{ status: "loading" }}
		/>
	);
}

function ignoreError() {}

function toSectionState<TData, TReady extends object>(
	query: UseQueryResult<TData>,
	toReady: (data: TData) => TReady,
) {
	if (query.isPending) return { status: "loading" as const };
	if (query.isError) return { status: "error" as const };
	return { ...toReady(query.data), status: "ready" as const };
}
