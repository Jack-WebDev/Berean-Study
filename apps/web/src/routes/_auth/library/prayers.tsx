import { createFileRoute } from "@tanstack/react-router";
import { HeartIcon } from "lucide-react";

import { DestinationPage } from "@/components/application/destination-page";

export const Route = createFileRoute("/_auth/library/prayers")({
	component: PrayersPage,
});

function PrayersPage() {
	return (
		<DestinationPage
			description="Your prayers and testimonies will appear here."
			icon={HeartIcon}
			title="Prayers & Testimonies"
		/>
	);
}
