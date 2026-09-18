import { createFileRoute } from "@tanstack/react-router";

import { PrayersPage } from "@/components/faith/prayers-page";

export const Route = createFileRoute("/_auth/library/prayers/")({
	component: PrayersRoute,
});

function PrayersRoute() {
	return <PrayersPage />;
}
