import { createFileRoute } from "@tanstack/react-router";

import { CollectionDetailPage } from "@/components/collections/collection-detail-page";

export const Route = createFileRoute(
	"/_auth/library/collections/$collectionId/",
)({
	component: CollectionRoute,
});

function CollectionRoute() {
	const { collectionId } = Route.useParams();
	return <CollectionDetailPage collectionId={Number(collectionId)} />;
}
