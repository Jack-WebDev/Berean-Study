import { createFileRoute } from "@tanstack/react-router";

import { SecurityPage } from "@/components/account/security/security-page";

export const Route = createFileRoute("/_auth/account/security/")({
	component: SecurityPage,
	staticData: {
		title: "Security",
		description: "Keep your account safe and in your control.",
	},
});
