import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CommunitySharePage } from "@/components/community/community-share-page";

export const Route = createFileRoute("/_auth/community/share")({
	component: CommunityShareRoute,
	validateSearch: z.object({
		/** Preselects an item to share, e.g. from a note's Details tab. */
		source: z.coerce.number().int().positive().optional(),
		type: z.enum(["collection", "note", "testimony", "prayer"]).optional(),
	}),
});

function CommunityShareRoute() {
	const { source, type } = Route.useSearch();
	return <CommunitySharePage initialSourceId={source} initialType={type} />;
}
