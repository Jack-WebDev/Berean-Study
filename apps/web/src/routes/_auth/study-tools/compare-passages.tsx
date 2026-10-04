import { createFileRoute } from "@tanstack/react-router";

import { ComparePassagesPage } from "@/components/study-tools/compare-passages-page";

export const Route = createFileRoute("/_auth/study-tools/compare-passages")({
	component: ComparePassagesPage,
});
