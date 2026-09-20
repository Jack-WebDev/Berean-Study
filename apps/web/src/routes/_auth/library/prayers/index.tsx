import { createFileRoute } from "@tanstack/react-router";

import { PrayersPage } from "@/components/prayer/prayers-page";

export const Route = createFileRoute("/_auth/library/prayers/")({
	component: PrayersRoute,
});

function PrayersRoute() {
	return <PrayersPage />;
}
