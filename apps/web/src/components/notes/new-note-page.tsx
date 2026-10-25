import { emptyRichTextDocument } from "@berean-study/rich-text-editor";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { NoteForm } from "./note-form";

export function NewNotePage({
	initialPassageId,
	returnPassageId,
}: {
	initialPassageId?: number;
	returnPassageId?: number;
}) {
	const navigate = useNavigate({ from: "/library/notes/new" });

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
					returnPassageId
						? navigate({ search: { passage: returnPassageId }, to: "/bible" })
						: navigate({ to: "/library/notes" })
				}
				onSaved={(note) => {
					toast.success("Note saved.");
					navigate({
						search: { note: note.id, return: returnPassageId },
						to: "/library/notes",
					});
				}}
				submitLabel="Save note"
			/>
		</div>
	);
}
