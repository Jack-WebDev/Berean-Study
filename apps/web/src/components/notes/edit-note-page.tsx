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

import { getNote } from "@/functions/notes";

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

	return (
		<div className="min-h-full bg-background text-foreground">
			<h1 className="sr-only">Edit note</h1>
			{note === undefined ? (
				<p
					aria-live="polite"
					className="mx-auto mt-8 max-w-[1680px] px-4 text-muted-foreground text-sm sm:px-8"
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
				<NoteForm
					initialNote={note}
					initialValues={{
						content: note.content,
						passageIds: note.passages.map((passage) => passage.id),
						tags: note.tags.map((tag) => tag.name),
						title: note.title,
					}}
					isNew={false}
					key={note.id}
					onDeleted={() => navigate({ to: "/library/notes" })}
					onDuplicated={(copyId) =>
						navigate({
							params: { noteId: copyId },
							to: "/library/notes/$noteId/edit",
						})
					}
					onLeave={() =>
						navigate({ search: { note: note.id }, to: "/library/notes" })
					}
					onSaved={() => {
						toast.success("Note saved.");
						navigate({ search: { note: note.id }, to: "/library/notes" });
					}}
					submitLabel="Save note"
				/>
			)}
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
