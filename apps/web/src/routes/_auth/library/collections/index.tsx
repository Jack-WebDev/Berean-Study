import { createFileRoute } from "@tanstack/react-router";

import { CollectionsPage } from "@/components/collections/collections-page";

export const Route = createFileRoute("/_auth/library/collections/")({
	component: CollectionsPage,
});
