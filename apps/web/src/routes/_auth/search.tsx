import { createFileRoute } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";

import { DestinationPage } from "@/components/application/destination-page";

export const Route = createFileRoute("/_auth/search")({
	component: SearchPage,
});

function SearchPage() {
	return (
		<DestinationPage
			description="Search Scripture and study material from one focused place."
			icon={SearchIcon}
			title="Search"
		/>
	);
}
