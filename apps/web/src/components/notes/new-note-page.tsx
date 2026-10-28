import { emptyRichTextDocument } from "@berean-study/rich-text-editor";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { setCollectionsForNote } from "@/functions/collections";
import { collectionKeys, libraryKeys } from "@/queries/keys";

import { NoteForm } from "./note-form";

export function NewNotePage({
	collectionId,
	initialPassageId,
	returnPassageId,
}: {
	/** Set when the note was started from a collection; it's filed there on save. */
	collectionId?: number;
	initialPassageId?: number;
	returnPassageId?: number;
}) {
	const navigate = useNavigate({ from: "/library/notes/new" });
	const queryClient = useQueryClient();
	const backToCollection = () =>
		navigate({
			params: { collectionId: String(collectionId) },
			to: "/library/collections/$collectionId",
		});

	return (
		<div className="min-h-full bg-background text-foreground">
			<h1 className="sr-only">New note</h1>
			<NoteForm
				initialValues={{
					content: emptyRichTextDocument,
					passageIds: initialPassageId ? [initialPassageId] : [],
					purpose: null,
					tags: [],
					title: "",
				}}
				isNew
				onDeleted={() => navigate({ to: "/library/notes" })}
				onDuplicated={(noteId) =>
					navigate({ params: { noteId }, to: "/library/notes/$noteId/edit" })
				}
				onLeave={() =>
					collectionId
						? backToCollection()
						: returnPassageId
							? navigate({ search: { passage: returnPassageId }, to: "/bible" })
							: navigate({ to: "/library/notes" })
				}
				onSaved={async (note) => {
					if (!collectionId) {
						toast.success("Note saved.");
						await navigate({
							search: { note: note.id, return: returnPassageId },
							to: "/library/notes",
						});
						return;
					}
					// The note itself is saved by now, so a failure here is reported
					// on its own rather than as a failed save.
					try {
						await setCollectionsForNote({
							data: { collectionIds: [collectionId], id: note.id },
						});
						await Promise.all([
							queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
							queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
						]);
						toast.success("Note saved to this collection.");
					} catch {
						toast.error(
							"Note saved, but we couldn't add it to the collection. Add it from the note's details.",
						);
					}
					await backToCollection();
				}}
				submitLabel="Save note"
			/>
		</div>
	);
}
