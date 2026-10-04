import { createFileRoute } from "@tanstack/react-router";

import { ThemesPage } from "@/components/study-tools/themes-page";

export const Route = createFileRoute("/_auth/study-tools/themes")({
	component: ThemesPage,
});
