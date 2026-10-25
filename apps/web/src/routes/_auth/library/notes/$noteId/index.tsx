import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { NoteReadingPage } from "@/components/notes/note-reading-page";

/** A note's own reading page, used where the list and note can't sit side by side. */
export const Route = createFileRoute("/_auth/library/notes/$noteId/")({
	component: NoteReadingRoute,
	params: {
		parse: (params) =>
			z.object({ noteId: z.coerce.number().int().positive() }).parse(params),
		stringify: (params) => ({ noteId: params.noteId.toString() }),
	},
});

function NoteReadingRoute() {
	return <NoteReadingPage noteId={Route.useParams().noteId} />;
}
