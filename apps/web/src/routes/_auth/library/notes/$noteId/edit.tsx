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
});

function EditNoteRoute() {
	return <EditNotePage noteId={Route.useParams().noteId} />;
}
