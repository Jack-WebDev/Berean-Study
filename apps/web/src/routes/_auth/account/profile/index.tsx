import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "@/components/account/profile/profile-page";

export const Route = createFileRoute("/_auth/account/profile/")({
	component: ProfilePage,
	staticData: {
		title: "Account",
		description: "Manage your personal account details.",
	},
});
