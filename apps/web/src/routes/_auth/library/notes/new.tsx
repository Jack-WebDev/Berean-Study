import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { NewNotePage } from "@/components/notes/new-note-page";

export const Route = createFileRoute("/_auth/library/notes/new")({
	component: NewNoteRoute,
	validateSearch: z.object({
		collection: z.coerce.number().int().positive().optional(),
		passage: z.coerce.number().int().positive().optional(),
		return: z.coerce.number().int().positive().optional(),
	}),
});

function NewNoteRoute() {
	const { collection, passage, return: returnPassageId } = Route.useSearch();
	return (
		<NewNotePage
			collectionId={collection}
			initialPassageId={passage}
			returnPassageId={returnPassageId}
		/>
	);
}
