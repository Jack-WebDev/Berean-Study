import { createFileRoute } from "@tanstack/react-router";

import { NotificationsCenter } from "@/components/notifications/notifications-center";

export const Route = createFileRoute("/_auth/notifications")({
	component: NotificationsCenter,
});
