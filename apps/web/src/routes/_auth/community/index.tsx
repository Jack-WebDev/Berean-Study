import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import type { CommunityFilter } from "@/components/community/community-filter-navigation";
import { CommunityPage } from "@/components/community/community-page";

export const Route = createFileRoute("/_auth/community/")({
	component: CommunityRoute,
	validateSearch: z.object({
		type: z.enum(["collection", "note", "testimony", "prayer"]).optional(),
		view: z.enum(["featured", "recent"]).optional(),
	}),
});

function CommunityRoute() {
	const { type, view } = Route.useSearch();
	const navigate = useNavigate({ from: "/community/" });
	const activeFilter: CommunityFilter = type ?? view ?? "featured";

	return (
		<CommunityPage
			activeFilter={activeFilter}
			onFilterChange={(filter) =>
				navigate({
					to: ".",
					search:
						filter === "featured"
							? {}
							: filter === "recent"
								? { view: filter }
								: { type: filter },
				})
			}
		/>
	);
}
