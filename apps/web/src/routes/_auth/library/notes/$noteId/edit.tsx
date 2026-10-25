import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { EditNotePage } from "@/components/notes/edit-note-page";

export const Route = createFileRoute("/_auth/library/notes/$noteId/edit")({
	component: EditNoteRoute,
	params: {
		parse: (params) =>
			z.object({ noteId: z.coerce.number().int().positive() }).parse(params),
		stringify: (params) => ({ noteId: params.noteId.toString() }),
	},
	validateSearch: z.object({
		/** The field to focus first, when a library prompt opened the editor. */
		focus: z.enum(["passage", "purpose", "tags", "title"]).optional(),
	}),
});

function EditNoteRoute() {
	return (
		<EditNotePage
			focus={Route.useSearch().focus}
			noteId={Route.useParams().noteId}
		/>
	);
}
