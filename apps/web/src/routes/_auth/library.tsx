import { createFileRoute } from "@tanstack/react-router";
import { LibraryIcon } from "lucide-react";

import { DestinationPage } from "@/components/application/destination-page";

export const Route = createFileRoute("/_auth/library")({
	component: LibraryPage,
});

function LibraryPage() {
	return (
		<DestinationPage
			description="Bookmarks, notes, highlights, and reading history belong here."
			icon={LibraryIcon}
			title="Library"
		/>
	);
}
