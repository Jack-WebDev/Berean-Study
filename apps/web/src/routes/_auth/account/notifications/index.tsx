import { createFileRoute } from "@tanstack/react-router";

import { NotificationsPage } from "@/components/account/notifications/notifications-page";

export const Route = createFileRoute("/_auth/account/notifications/")({
	component: NotificationsPage,
	staticData: {
		title: "Notifications",
		description: "Choose what you want to be notified about.",
	},
});
