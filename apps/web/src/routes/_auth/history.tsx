import { createFileRoute } from "@tanstack/react-router";
import { FileClockIcon } from "lucide-react";

import { DestinationPage } from "@/components/application/destination-page";

export const Route = createFileRoute("/_auth/history")({
	component: HistoryPage,
});

function HistoryPage() {
	return (
		<DestinationPage
			description="Your recently read passages will appear here."
			icon={FileClockIcon}
			title="Reading History"
		/>
	);
}
