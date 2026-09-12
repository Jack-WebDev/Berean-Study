import { createFileRoute } from "@tanstack/react-router";

import { PreferencesPage } from "@/components/account/preferences/preferences-page";

export const Route = createFileRoute("/_auth/account/preferences/")({
	component: PreferencesPage,
	staticData: {
		title: "Preferences",
		description: "Customize your Bible and reading experience.",
	},
});
