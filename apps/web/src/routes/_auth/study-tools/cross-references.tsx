import { createFileRoute } from "@tanstack/react-router";

import { CrossReferencesPage } from "@/components/study-tools/cross-references-page";

export const Route = createFileRoute("/_auth/study-tools/cross-references")({
	component: CrossReferencesPage,
});
