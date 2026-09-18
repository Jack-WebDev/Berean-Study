import { createFileRoute } from "@tanstack/react-router";
import type { LibraryDestinationCountsState } from "@/components/library/library-destinations";
import {
	type ContinueReadingState,
	LibraryPage,
} from "@/components/library/library-page";
import type { RecentLibraryActivityState } from "@/components/library/recent-library-activity";
import type { RecentlyStudiedState } from "@/components/library/recently-studied";
import {
	getContinueReading,
	getLibraryDestinationCounts,
	getRecentLibraryActivity,
	getRecentlyStudied,
} from "@/functions/get-library-overview";

export const Route = createFileRoute("/_auth/library/")({
	component: LibraryRoute,
	loader: loadLibraryData,
	pendingComponent: LibraryLoadingRoute,
});

type LibraryData = {
	continueReading: ContinueReadingState;
	destinationCounts: LibraryDestinationCountsState;
	recentActivity: RecentLibraryActivityState;
	recentlyStudied: RecentlyStudiedState;
};

function LibraryRoute() {
	const {
		continueReading,
		destinationCounts,
		recentActivity,
		recentlyStudied,
	} = Route.useLoaderData();
	return (
		<LibraryPage
			continueReading={continueReading}
			destinationCounts={destinationCounts}
			recentActivity={recentActivity}
			recentlyStudied={recentlyStudied}
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

async function loadLibraryData(): Promise<LibraryData> {
	const [continueReading, destinationCounts, recentActivity, recentlyStudied] =
		await Promise.all([
			loadSection(
				getContinueReading(),
				(value) => ({
					...value,
					status: "ready" as const,
				}),
				{ status: "error" },
			),
			loadSection(
				getLibraryDestinationCounts(),
				(counts) => ({
					counts,
					status: "ready" as const,
				}),
				{ status: "error" },
			),
			loadSection(
				getRecentLibraryActivity(),
				(items) => ({
					items,
					status: "ready" as const,
				}),
				{ status: "error" },
			),
			loadSection(
				getRecentlyStudied(),
				(items) => ({
					items,
					status: "ready" as const,
				}),
				{ status: "error" },
			),
		]);

	return {
		continueReading,
		destinationCounts,
		recentActivity,
		recentlyStudied,
	};
}

async function loadSection<Result, State>(
	request: Promise<Result>,
	toReadyState: (result: Result) => State,
	errorState: State,
): Promise<State> {
	try {
		return toReadyState(await request);
	} catch {
		return errorState;
	}
}
