import { createFileRoute } from "@tanstack/react-router";
import { ShapesIcon } from "lucide-react";

import { DestinationPage } from "@/components/application/destination-page";

export const Route = createFileRoute("/_auth/themes")({
	component: ThemesPage,
});

function ThemesPage() {
	return (
		<DestinationPage
			description="Explore themes as a path into related passages and study."
			icon={ShapesIcon}
			title="Themes"
		/>
	);
}
