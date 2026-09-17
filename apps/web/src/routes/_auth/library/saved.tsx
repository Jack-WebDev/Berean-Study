import { createFileRoute } from "@tanstack/react-router";
import { BookmarkIcon } from "lucide-react";

import { DestinationPage } from "@/components/application/destination-page";

export const Route = createFileRoute("/_auth/library/saved")({
	component: SavedPage,
});

function SavedPage() {
	return (
		<DestinationPage
			description="Your saved highlights and bookmarks will appear here."
			icon={BookmarkIcon}
			title="Saved"
		/>
	);
}
