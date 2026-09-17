import { Button } from "@berean-study/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { useNavigate } from "@tanstack/react-router";
import { FileTextIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getNote, setNoteTags, updateNote } from "@/functions/notes";

import type { NoteFormValues } from "./note-autosave-status";
import { parseNoteContent, serializeNoteContent } from "./note-content";
import { NoteForm } from "./note-form";
import type { Note } from "./types";

export function EditNotePage({ noteId }: { noteId: number }) {
	const navigate = useNavigate({ from: "/library/notes/$noteId/edit" });
	const [note, setNote] = useState<Note | null | undefined>(undefined);
	const [hasLoadError, setHasLoadError] = useState(false);

	const loadNote = useCallback(async () => {
		setHasLoadError(false);

		try {
			setNote(await getNote({ data: { id: noteId } }));
		} catch {
			setHasLoadError(true);
		}
	}, [noteId]);

	useEffect(() => {
		void loadNote();
	}, [loadNote]);

	const saveNote = async (values: NoteFormValues) => {
		const updatedNote = await updateNote({
			data: {
				content: serializeNoteContent(values.content),
				id: noteId,
				passageId: Number(values.passageId),
			},
		});
		if (!updatedNote) throw new Error("Note not found.");
		await setNoteTags({ data: { id: noteId, tags: values.tags } });
	};

	return (
		<div className="min-h-full bg-background px-5 py-8 text-foreground sm:px-8 lg:px-12">
			<div className="mx-auto w-full max-w-4xl">
				{note === undefined ? (
					<p
						aria-live="polite"
						className="mt-8 text-muted-foreground text-sm"
						role="status"
					>
						Loading note…
					</p>
				) : hasLoadError ? (
					<NoteLoadState
						description="Please try loading the note again."
						onRetry={() => void loadNote()}
						title="Note unavailable"
					/>
				) : note === null ? (
					<NoteLoadState
						description="It may have been deleted or is no longer available."
						title="Note not found"
					/>
				) : (
					<>
						<header>
							<h1 className="font-serif text-3xl tracking-[-0.02em] sm:text-4xl">
								Edit Note
							</h1>
							<p className="mt-2 text-muted-foreground text-sm leading-6">
								Update your reflection and its Scripture connection.
							</p>
						</header>
						<NoteForm
							initialValues={{
								content: parseNoteContent(note.content),
								passageId: note.passageId.toString(),
								tags: note.tags.map((tag) => tag.name),
							}}
							key={note.id}
							onCancel={() =>
								navigate({ to: "/library/notes", search: { note: note.id } })
							}
							onAutosave={saveNote}
							onSubmit={async (values) => {
								await saveNote(values);
								toast.success("Note updated.");
								navigate({
									to: "/library/notes",
									search: { addToCollection: true, note: note.id },
								});
							}}
							submitLabel="Save changes"
						/>
					</>
				)}
			</div>
		</div>
	);
}

function NoteLoadState({
	description,
	onRetry,
	title,
}: {
	description: string;
	onRetry?: () => void;
	title: string;
}) {
	return (
		<Empty className="mt-8 border-0">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<FileTextIcon aria-hidden="true" />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			{onRetry ? (
				<Button onClick={onRetry} size="sm" type="button" variant="outline">
					Try again
				</Button>
			) : null}
		</Empty>
	);
}
