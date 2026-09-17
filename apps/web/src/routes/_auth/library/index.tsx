import { createFileRoute } from "@tanstack/react-router";

import {
	type ContinueReadingState,
	LibraryPage,
} from "@/components/library/library-page";
import type { RecentLibraryActivityState } from "@/components/library/recent-library-activity";
import { getReaderHomeOverview } from "@/functions/get-reader-home-overview";
import { getRecentLibraryActivity } from "@/functions/get-recent-library-activity";

export const Route = createFileRoute("/_auth/library/")({
	component: LibraryRoute,
	loader: loadLibraryData,
	pendingComponent: LibraryLoadingRoute,
});

function LibraryRoute() {
	const { continueReading, recentActivity } = Route.useLoaderData();
	return (
		<LibraryPage
			continueReading={continueReading}
			recentActivity={recentActivity}
		/>
	);
}

function LibraryLoadingRoute() {
	return (
		<LibraryPage
			continueReading={{ status: "loading" }}
			recentActivity={{ status: "loading" }}
		/>
	);
}

async function loadLibraryData() {
	const [continueReading, recentActivity] = await Promise.all([
		loadContinueReading(),
		loadRecentLibraryActivity(),
	]);

	return { continueReading, recentActivity };
}

async function loadContinueReading(): Promise<ContinueReadingState> {
	try {
		const overview = await getReaderHomeOverview();

		return {
			continueReading: overview?.continueReading ?? null,
			lastStudiedAt:
				overview?.recentlyRead.find(
					({ passageId }) => passageId === overview.continueReading?.passageId,
				)?.visitedAt ?? null,
			status: "ready",
		};
	} catch {
		return { status: "error" };
	}
}

async function loadRecentLibraryActivity(): Promise<RecentLibraryActivityState> {
	try {
		return { items: await getRecentLibraryActivity(), status: "ready" };
	} catch {
		return { status: "error" };
	}
}
