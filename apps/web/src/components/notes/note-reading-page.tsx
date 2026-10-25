import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { noteQueryOptions } from "@/queries/notes";

import { NoteReadingPane } from "./note-reading-pane";
import { NotesListState, RetryButton } from "./notes-list";

/** One note on its own page, for screens too narrow for the list beside it. */
export function NoteReadingPage({ noteId }: { noteId: number }) {
	const navigate = useNavigate();
	const noteQuery = useQuery(noteQueryOptions(noteId));
	const backLink = (
		<Link
			className="flex min-h-10 items-center gap-1.5 rounded-lg pr-2 text-secondary-foreground text-sm hover:bg-secondary"
			search={{ note: noteId }}
			to="/library/notes"
		>
			<ArrowLeftIcon aria-hidden="true" className="size-4" />
			Notes
		</Link>
	);

	if (noteQuery.isPending)
		return (
			<p
				aria-live="polite"
				className="px-5 pt-8 text-muted-foreground text-sm"
				role="status"
			>
				Loading note…
			</p>
		);
	if (noteQuery.isError || !noteQuery.data)
		return (
			<div className="flex flex-col gap-4 px-5 pt-6">
				{backLink}
				<NotesListState
					action={
						noteQuery.isError ? (
							<RetryButton onRetry={() => void noteQuery.refetch()} />
						) : undefined
					}
					description={
						noteQuery.isError
							? "Please try loading the note again."
							: "It may have been deleted or is no longer available."
					}
					title={noteQuery.isError ? "Note unavailable" : "Note not found"}
				/>
			</div>
		);

	return (
		<div className="contain-[inline-size] min-h-full bg-card">
			<h1 className="sr-only">Note</h1>
			<NoteReadingPane
				leading={<div className="w-full">{backLink}</div>}
				note={noteQuery.data}
				onDeleted={() => void navigate({ to: "/library/notes" })}
				onDuplicated={(copyId) =>
					void navigate({
						params: { noteId: copyId },
						to: "/library/notes/$noteId",
					})
				}
			/>
		</div>
	);
}
