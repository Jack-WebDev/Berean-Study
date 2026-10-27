import { createFileRoute } from "@tanstack/react-router";

import { TestimonyEditorPage } from "@/components/journal/testimony-editor-page";

export const Route = createFileRoute("/_focus/library/testimonies/new")({
	component: () => <TestimonyEditorPage />,
});
