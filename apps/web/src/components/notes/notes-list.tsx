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
import { Link, useNavigate } from "@tanstack/react-router";
import { FileTextIcon, PinIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";

import {
	describeListItem,
	formatListTime,
	groupNotes,
	sortLabels,
} from "./note-library";
import type { Note, NoteSort, NotesSearch } from "./types";

/**
 * Notes grouped under date headings. ↑/↓ moves the selection and Enter opens
 * the editor. On narrow screens a row opens the note's own reading page
 * instead of selecting it beside the list.
 */
export function NotesList({
	isNarrow,
	notes,
	search,
	selectedNoteId,
	sort,
}: {
	isNarrow: boolean;
	notes: readonly Note[];
	search: NotesSearch;
	selectedNoteId: number | null;
	sort: NoteSort;
}) {
	const navigate = useNavigate();
	const listRef = useRef<HTMLDivElement>(null);
	const groups = groupNotes(notes, sort);
	const ordered = groups.flatMap((group) => group.notes);
	const now = new Date();

	// Bring a selection made elsewhere (a link, a reload) into view.
	useEffect(() => {
		if (selectedNoteId === null) return;
		listRef.current
			?.querySelector(`[data-note-id="${selectedNoteId}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [selectedNoteId]);

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const row = (event.target as HTMLElement).closest<HTMLElement>(
			"[data-note-id]",
		);
		if (!row) return;
		const index = ordered.findIndex(
			(note) => String(note.id) === row.dataset.noteId,
		);

		if (event.key === "Enter") {
			event.preventDefault();
			const note = ordered[index];
			if (note)
				void navigate({
					params: { noteId: note.id },
					to: "/library/notes/$noteId/edit",
				});
			return;
		}

		const step =
			event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
		const next = ordered[index + step];
		if (!step || !next) return;
		event.preventDefault();
		listRef.current
			?.querySelector<HTMLElement>(`[data-note-id="${next.id}"]`)
			?.focus();
		if (!isNarrow)
			void navigate({
				replace: true,
				search: { ...search, note: next.id },
				to: "/library/notes",
			});
	};

	// One tab stop for the list; arrow keys move within it.
	const tabStopId = selectedNoteId ?? ordered[0]?.id;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: keys are handled for the links inside.
		<div
			className="flex flex-col gap-1 px-3 pb-6"
			onKeyDown={onKeyDown}
			ref={listRef}
		>
			{groups.map((group, groupIndex) => (
				<section aria-label={group.label} key={group.label}>
					<h2 className="flex items-center justify-between gap-3 px-2 pt-4 pb-2 font-semibold text-muted-foreground text-xs uppercase tracking-[0.06em]">
						<span className="flex items-center gap-1.5">
							{group.label === "Pinned" ? (
								<PinIcon aria-hidden="true" className="size-3" />
							) : null}
							{group.label}
						</span>
						{groupIndex === 0 ? (
							<span className="font-medium normal-case tracking-normal">
								{sortLabels[sort]}
							</span>
						) : null}
					</h2>
					<ul className="flex flex-col gap-1">
						{group.notes.map((note) => (
							<li key={note.id}>
								<NotesListRow
									isNarrow={isNarrow}
									isSelected={!isNarrow && note.id === selectedNoteId}
									note={note}
									now={now}
									search={search}
									sort={sort}
									tabIndex={note.id === tabStopId ? 0 : -1}
								/>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}

function NotesListRow({
	isNarrow,
	isSelected,
	note,
	now,
	search,
	sort,
	tabIndex,
}: {
	isNarrow: boolean;
	isSelected: boolean;
	note: Note;
	now: Date;
	search: NotesSearch;
	sort: NoteSort;
	tabIndex: number;
}) {
	const { isUntitled, preview, title } = describeListItem(note);
	const mainPassage = note.passages[0];
	const shownAt = sort === "created" ? note.createdAt : note.updatedAt;
	const className = cn(
		"flex flex-col gap-1.5 rounded-r-xl border border-transparent border-l-3 px-3.5 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
		isSelected
			? "border-border border-l-primary bg-card shadow-[0_2px_8px_color-mix(in_oklab,var(--foreground),transparent_94%)]"
			: "hover:bg-secondary/70",
	);
	const content = (
		<>
			<span className="flex items-baseline gap-3">
				<span
					className={cn(
						"min-w-0 flex-1 truncate font-serif text-lg leading-snug",
						isUntitled && "text-muted-foreground italic",
					)}
				>
					{title}
				</span>
				<time
					className="shrink-0 text-muted-foreground text-xs"
					dateTime={new Date(shownAt).toISOString()}
				>
					{formatListTime(shownAt, now)}
				</time>
			</span>
			{preview ? (
				<span className="line-clamp-2 text-muted-foreground text-sm leading-5">
					{preview}
				</span>
			) : null}
			{note.status === "draft" || mainPassage ? (
				<span className="flex flex-wrap items-center gap-1.5">
					{note.status === "draft" ? <DraftTag /> : null}
					{mainPassage ? (
						<span className="truncate rounded-full bg-scripture px-2 py-0.5 font-serif text-[13px] text-scripture-foreground">
							{mainPassage.label}
							{note.passages.length > 1
								? ` +${note.passages.length - 1}`
								: null}
						</span>
					) : null}
				</span>
			) : null}
		</>
	);

	return isNarrow ? (
		<Link
			className={className}
			data-note-id={note.id}
			params={{ noteId: note.id }}
			tabIndex={tabIndex}
			to="/library/notes/$noteId"
		>
			{content}
		</Link>
	) : (
		<Link
			aria-current={isSelected ? "true" : undefined}
			className={className}
			data-note-id={note.id}
			replace
			search={{ ...search, note: note.id }}
			tabIndex={tabIndex}
			to="/library/notes"
		>
			{content}
		</Link>
	);
}

export function DraftTag() {
	return (
		<span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground text-xs">
			Draft
		</span>
	);
}

export function NotesListState({
	action,
	description,
	title,
}: {
	action?: ReactNode;
	description: string;
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
			{action}
		</Empty>
	);
}

export function NotesListSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-label="Loading notes"
			aria-live="polite"
			className="flex flex-col gap-2 px-5 pt-6"
			role="status"
		>
			<Skeleton className="mb-2 h-3 w-24" />
			{Array.from({ length: 5 }, (_, index) => (
				<div className="flex flex-col gap-2 py-3" key={index}>
					<div className="flex justify-between gap-6">
						<Skeleton className="h-5 w-2/3" />
						<Skeleton className="h-3 w-10" />
					</div>
					<Skeleton className="h-3.5 w-full" />
					<Skeleton className="h-3.5 w-4/5" />
				</div>
			))}
		</div>
	);
}

export function RetryButton({ onRetry }: { onRetry: () => void }) {
	return (
		<Button onClick={onRetry} size="sm" type="button" variant="outline">
			Try again
		</Button>
	);
}
