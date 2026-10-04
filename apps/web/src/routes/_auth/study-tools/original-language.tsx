import { createFileRoute } from "@tanstack/react-router";

import { OriginalLanguagePage } from "@/components/study-tools/original-language-page";

export const Route = createFileRoute("/_auth/study-tools/original-language")({
	component: OriginalLanguagePage,
});
