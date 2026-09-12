import { createFileRoute } from "@tanstack/react-router";

import { ReadingPage } from "@/components/account/reading/reading-page";

export const Route = createFileRoute("/_auth/account/reading/")({
	component: ReadingPage,
	staticData: {
		title: "Reading",
		description: "Personalize your reading experience.",
	},
});
