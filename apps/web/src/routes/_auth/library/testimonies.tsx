import { createFileRoute } from "@tanstack/react-router";
import { HeartIcon } from "lucide-react";

import { DestinationPage } from "@/components/application/destination-page";

export const Route = createFileRoute("/_auth/library/testimonies")({
	component: TestimoniesPage,
});

function TestimoniesPage() {
	return (
		<DestinationPage
			description="Your personal faith records will appear here."
			icon={HeartIcon}
			title="Testimonies"
		/>
	);
}
