import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { SavedPage, type SavedView } from "@/components/saved/saved-page";

export const Route = createFileRoute("/_auth/library/saved")({
	component: SavedRoute,
	validateSearch: z.object({
		tab: z.enum(["bookmarks", "highlights"]).catch("bookmarks"),
	}),
});

function SavedRoute() {
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/library/saved" });

	return (
		<SavedPage
			onViewChange={(nextView: SavedView) =>
				navigate({ to: "/library/saved", search: { tab: nextView } })
			}
			view={tab}
		/>
	);
}
