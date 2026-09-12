import { createFileRoute } from "@tanstack/react-router";
import { BookOpenIcon } from "lucide-react";

import { DestinationPage } from "@/components/application/destination-page";

export const Route = createFileRoute("/_auth/bible")({
	component: BiblePage,
});

function BiblePage() {
	return (
		<DestinationPage
			description="Choose a testament to begin reading Scripture."
			icon={BookOpenIcon}
			readingPreferences
			title="Bible"
		/>
	);
}
