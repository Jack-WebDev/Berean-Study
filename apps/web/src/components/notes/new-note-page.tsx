import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { createNote, setNoteTags, updateNote } from "@/functions/notes";
import type { NoteFormValues } from "./note-autosave-status";
import { emptyNoteDocument, serializeNoteContent } from "./note-content";
import { NoteForm } from "./note-form";

export function NewNotePage({
	initialPassageId,
	returnPassageId,
}: {
	initialPassageId?: number;
	returnPassageId?: number;
}) {
	const navigate = useNavigate({ from: "/library/notes/new" });
	const createdNoteId = useRef<number | null>(null);
	const saveNote = async (values: NoteFormValues) => {
		const passageId = values.passageId ? Number(values.passageId) : null;
		const data = {
			content: serializeNoteContent(values.content),
			passageId,
		};
		const note = createdNoteId.current
			? await updateNote({ data: { ...data, id: createdNoteId.current } })
			: await createNote({ data });
		if (!note) throw new Error("Note not found.");
		createdNoteId.current = note.id;
		await setNoteTags({ data: { id: note.id, tags: values.tags } });
		return note;
	};

	return (
		<div className="min-h-full bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-[90rem]">
				<header>
					<Link
						className="inline-flex items-center gap-2 font-medium text-primary text-xs hover:underline"
						to="/library/notes"
					>
						<ArrowLeftIcon aria-hidden="true" className="size-3.5" />
						Notes <span className="text-muted-foreground">/ Create note</span>
					</Link>
					<h1 className="mt-4 font-serif text-3xl tracking-[-0.03em] sm:text-[2.7rem]">
						New Note
					</h1>
					<p className="mt-1 font-serif text-muted-foreground text-sm leading-6 sm:text-base">
						Capture what you’re learning from Scripture with clarity and
						purpose.
					</p>
				</header>
				<NoteForm
					initialValues={{
						content: emptyNoteDocument,
						passageId: initialPassageId?.toString() ?? "",
						tags: [],
					}}
					onCancel={() =>
						returnPassageId
							? navigate({
									to: "/bible",
									search: { passage: returnPassageId },
								})
							: navigate({ to: "/library/notes" })
					}
					onSubmit={async (values) => {
						const note = await saveNote(values);
						toast.success("Note saved.");
						navigate({
							to: "/library/notes",
							search: {
								addToCollection: true,
								note: note.id,
								passage: values.passageId
									? Number(values.passageId)
									: undefined,
								return: returnPassageId,
							},
						});
					}}
					onAutosave={async (values) => {
						await saveNote(values);
					}}
					onSaveDraft={async (values) => {
						await saveNote(values);
						toast.success("Draft saved.");
					}}
					submitLabel="Save note"
				/>
			</div>
		</div>
	);
}
