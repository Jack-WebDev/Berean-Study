import { createFileRoute } from "@tanstack/react-router";

import { PrayerRecordsPage } from "@/components/faith/prayer-records-page";

export const Route = createFileRoute("/_auth/library/prayers/")({
	component: PrayersRoute,
});

function PrayersRoute() {
	return <PrayerRecordsPage />;
}
