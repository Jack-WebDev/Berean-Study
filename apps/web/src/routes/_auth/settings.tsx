import { createFileRoute } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";

import { DestinationPage } from "@/components/application/destination-page";

export const Route = createFileRoute("/_auth/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<DestinationPage
			description="Reading and account preferences will be managed here."
			icon={SettingsIcon}
			title="Settings"
		/>
	);
}
