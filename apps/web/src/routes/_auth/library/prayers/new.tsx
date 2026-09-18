import { createFileRoute } from "@tanstack/react-router";

import { NewPrayerPage } from "@/components/faith/new-prayer-page";

export const Route = createFileRoute("/_auth/library/prayers/new")({
	component: NewPrayerRoute,
});

function NewPrayerRoute() {
	return <NewPrayerPage />;
}
