import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import {
	CollectionDetailPage,
	type CollectionTab,
} from "@/components/collections/collection-detail-page";

export const Route = createFileRoute(
	"/_auth/library/collections/$collectionId/",
)({
	component: CollectionRoute,
	validateSearch: z.object({
		tab: z.enum(["passages", "notes", "overview"]).optional().catch(undefined),
	}),
});

function CollectionRoute() {
	const { collectionId } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/library/collections/$collectionId/" });

	return (
		<CollectionDetailPage
			collectionId={Number(collectionId)}
			onTabChange={(next: CollectionTab) =>
				void navigate({
					replace: true,
					search: { tab: next === "passages" ? undefined : next },
					to: ".",
				})
			}
			tab={tab ?? "passages"}
		/>
	);
}
