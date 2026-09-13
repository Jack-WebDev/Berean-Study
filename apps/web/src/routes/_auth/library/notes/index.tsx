import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { NotesPage } from "@/components/notes/notes-page";

export const Route = createFileRoute("/_auth/library/notes/")({
	component: NotesRoute,
	validateSearch: z.object({
		book: z.coerce.number().int().positive().optional(),
		collection: z.coerce.number().int().positive().optional(),
		note: z.coerce.number().int().positive().optional(),
		passage: z.coerce.number().int().positive().optional(),
		q: z.string().trim().max(200).optional(),
		return: z.coerce.number().int().positive().optional(),
		sort: z.literal("updated-desc").default("updated-desc"),
		tag: z.coerce.number().int().positive().optional(),
	}),
});

function NotesRoute() {
	const {
		book,
		collection,
		note,
		passage,
		q,
		return: returnPassageId,
		sort,
		tag,
	} = Route.useSearch();
	const navigate = useNavigate({ from: "/library/notes" });

	return (
		<NotesPage
			filters={{
				bookId: book,
				collectionId: collection,
				passageId: passage,
				query: q,
				sort,
				tagId: tag,
			}}
			onFiltersChange={(filters) =>
				navigate({
					to: "/library/notes",
					search: {
						book: filters.bookId,
						collection: filters.collectionId,
						passage: filters.passageId,
						q: filters.query,
						return: returnPassageId,
						sort: filters.sort,
						tag: filters.tagId,
					},
				})
			}
			onSelectNote={(noteId) =>
				navigate({
					to: "/library/notes",
					search: {
						book,
						collection,
						note: noteId,
						passage,
						q,
						return: returnPassageId,
						sort,
						tag,
					},
				})
			}
			returnPassageId={returnPassageId}
			selectedNoteId={note}
		/>
	);
}
