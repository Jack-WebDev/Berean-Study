import { Button } from "@berean-study/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FileTextIcon } from "lucide-react";
import { toast } from "sonner";

import { noteQueryOptions } from "@/queries/notes";

import { NoteForm } from "./note-form";
import type { NoteEditorFocus } from "./types";

export function EditNotePage({
	focus,
	noteId,
}: {
	focus?: NoteEditorFocus;
	noteId: number;
}) {
	const navigate = useNavigate({ from: "/library/notes/$noteId/edit" });
	const noteQuery = useQuery(noteQueryOptions(noteId));
	const note = noteQuery.data;

	return (
		<div className="min-h-full bg-background text-foreground">
			<h1 className="sr-only">Edit note</h1>
			{noteQuery.isPending ? (
				<p
					aria-live="polite"
					className="mx-auto mt-8 max-w-[1680px] px-4 text-muted-foreground text-sm sm:px-8"
					role="status"
				>
					Loading note…
				</p>
			) : noteQuery.isError ? (
				<NoteLoadState
					description="Please try loading the note again."
					onRetry={() => void noteQuery.refetch()}
					title="Note unavailable"
				/>
			) : !note ? (
				<NoteLoadState
					description="It may have been deleted or is no longer available."
					title="Note not found"
				/>
			) : (
				<NoteForm
					initialFocus={focus}
					initialNote={note}
					initialValues={{
						content: note.content,
						passageIds: note.passages.map((passage) => passage.id),
						purpose: note.purpose,
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
