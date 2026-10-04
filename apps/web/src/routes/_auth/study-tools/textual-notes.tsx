import { createFileRoute } from "@tanstack/react-router";

import { TextualNotesPage } from "@/components/study-tools/textual-notes-page";

export const Route = createFileRoute("/_auth/study-tools/textual-notes")({
	component: TextualNotesPage,
});
