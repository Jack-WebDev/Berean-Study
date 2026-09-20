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
			loadContinueReading(),
			loadDestinationCounts(),
			loadRecentActivity(),
			loadRecentlyStudied(),
		]);

	return {
		continueReading,
		destinationCounts,
		recentActivity,
		recentlyStudied,
	};
}

async function loadContinueReading(): Promise<ContinueReadingState> {
	try {
		return { ...(await getContinueReading()), status: "ready" };
	} catch {
		return { status: "error" };
	}
}

async function loadDestinationCounts(): Promise<LibraryDestinationCountsState> {
	try {
		return { counts: await getLibraryDestinationCounts(), status: "ready" };
	} catch {
		return { status: "error" };
	}
}

async function loadRecentActivity(): Promise<RecentLibraryActivityState> {
	try {
		return { items: await getRecentLibraryActivity(), status: "ready" };
	} catch {
		return { status: "error" };
	}
}

async function loadRecentlyStudied(): Promise<RecentlyStudiedState> {
	try {
		return { items: await getRecentlyStudied(), status: "ready" };
	} catch {
		return { status: "error" };
	}
}
