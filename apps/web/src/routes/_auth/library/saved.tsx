import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { SavedPage, type SavedView } from "@/components/saved/saved-page";
import { getSavedItems } from "@/functions/saved-items";

export const Route = createFileRoute("/_auth/library/saved")({
	component: SavedRoute,
	loader: () => getSavedItems(),
	validateSearch: z.object({
		view: z.enum(["highlights", "bookmarks"]).default("highlights"),
	}),
});

function SavedRoute() {
	const { view } = Route.useSearch();
	const savedItems = Route.useLoaderData();
	const navigate = useNavigate({ from: "/library/saved" });

	return (
		<SavedPage
			onViewChange={(nextView: SavedView) =>
				navigate({ to: "/library/saved", search: { view: nextView } })
			}
			savedItems={savedItems}
			view={view}
		/>
	);
}
