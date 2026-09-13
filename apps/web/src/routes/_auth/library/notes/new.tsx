import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { NewNotePage } from "@/components/notes/new-note-page";

export const Route = createFileRoute("/_auth/library/notes/new")({
	component: NewNoteRoute,
	validateSearch: z.object({
		passage: z.coerce.number().int().positive().optional(),
		return: z.coerce.number().int().positive().optional(),
	}),
});

function NewNoteRoute() {
	const { passage, return: returnPassageId } = Route.useSearch();
	return (
		<NewNotePage initialPassageId={passage} returnPassageId={returnPassageId} />
	);
}
