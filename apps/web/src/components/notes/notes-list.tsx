import { Button } from "@berean-study/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import { cn } from "@berean-study/ui/lib/utils";
import { BookOpenIcon, FileTextIcon } from "lucide-react";

import { formatDate } from "@/lib/format";

import { getNoteContentText } from "./note-content";
import type { Note } from "./types";

export function NotesList({
	hasActiveFilters,
	hasLoadError,
	isLoading,
	notes,
	onRetry,
	onSelect,
	selectedNoteId,
}: {
	hasActiveFilters: boolean;
	hasLoadError: boolean;
	isLoading: boolean;
	notes: Note[];
	onRetry: () => void;
	onSelect: (noteId: number) => void;
	selectedNoteId: number | null;
}) {
	if (hasLoadError) {
		return (
			<NotesListEmptyState
				description="Unable to load your notes. Please try again."
				onRetry={onRetry}
				title="Notes unavailable"
			/>
		);
	}

	if (isLoading) return <NotesListSkeleton />;
	if (notes.length === 0) {
		return (
			<NotesListEmptyState
				description={
					hasActiveFilters
						? "Try a different search or book filter."
						: "Notes you create while studying Scripture will appear here."
				}
				title={hasActiveFilters ? "No matching notes" : "No notes yet"}
			/>
		);
	}

	return (
		<ul aria-label="Your notes" className="min-h-0 flex-1 overflow-y-auto">
			{notes.map((note) => (
				<li className="border-border/70 border-b last:border-b-0" key={note.id}>
					<button
						aria-pressed={note.id === selectedNoteId}
						className={cn(
							"notes-list-item flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
							note.id === selectedNoteId ? "is-selected" : "hover:bg-muted/60",
						)}
						onClick={() => onSelect(note.id)}
						type="button"
					>
						<span className="notes-list-title truncate">
							{notePreview(note.content).split(/[.!?]/)[0] || "Untitled note"}
						</span>
						<span className="flex min-w-0 items-center gap-2 text-primary text-xs">
							<BookOpenIcon aria-hidden="true" className="size-3.5 shrink-0" />
							<span className="truncate">{passageLabel(note)}</span>
						</span>
						<span className="line-clamp-2 text-muted-foreground text-sm leading-5">
							{notePreview(note.content)}
						</span>
						<span className="text-muted-foreground text-xs">
							Updated {formatDate(note.updatedAt, { dateStyle: "medium" })}
						</span>
					</button>
				</li>
			))}
		</ul>
	);
}

function NotesListEmptyState({
	description,
	onRetry,
	title,
}: {
	description: string;
	onRetry?: () => void;
	title: string;
}) {
	return (
		<Empty className="border-0">
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

function NotesListSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-label="Loading notes"
			aria-live="polite"
			className="flex flex-col gap-4 p-4"
			role="status"
		>
			{Array.from({ length: 5 }, (_, index) => (
				<div className="flex flex-col gap-2" key={index}>
					<Skeleton className="h-3 w-1/2" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-3 w-1/3" />
				</div>
			))}
		</div>
	);
}

export function passageLabel(note: Note) {
	return note.passageTitle ?? note.bookName;
}

function notePreview(content: string) {
	return getNoteContentText(content).replace(/\s+/g, " ").trim();
}
