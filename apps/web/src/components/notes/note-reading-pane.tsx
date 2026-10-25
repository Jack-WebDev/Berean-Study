import {
	getEstimatedReadingTime,
	getWordCount,
	RichTextRenderer,
	VerseBlockProvider,
	type VerseBlockSource,
} from "@berean-study/rich-text-editor";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@berean-study/ui/components/alert-dialog";
import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@berean-study/ui/components/tooltip";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	BookOpenIcon,
	CopyIcon,
	EllipsisIcon,
	FolderPlusIcon,
	PencilIcon,
	PinIcon,
	PinOffIcon,
	PlusIcon,
	PrinterIcon,
	ShareIcon,
	TagIcon,
	Trash2Icon,
} from "lucide-react";
import { type ReactElement, type ReactNode, useMemo, useState } from "react";

import { AddNoteToCollectionDialog } from "@/components/collections/add-note-to-collection-dialog";

import { copyNoteText, useNoteActions } from "./note-actions";
import { formatEdited, purposeLabel } from "./note-library";
import { useLoadVerses } from "./note-study-data";
import { DraftTag } from "./notes-list";
import type { Note, NoteEditorFocus } from "./types";

/**
 * A read-only view of one note with its actions. Missing details (title,
 * passage, purpose, tags) show as prompts that open the editor on that field.
 */
export function NoteReadingPane({
	leading,
	note,
	onDeleted,
	onDuplicated,
}: {
	/** Shown before the meta line, e.g. a back link on the phone layout. */
	leading?: ReactNode;
	note: Note;
	onDeleted: () => void;
	onDuplicated: (noteId: number) => void;
}) {
	const navigate = useNavigate();
	const actions = useNoteActions();
	const loadVerses = useLoadVerses();
	const [collectionsOpen, setCollectionsOpen] = useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const isPinned = Boolean(note.pinnedAt);
	const verseSource = useMemo<VerseBlockSource>(
		() => ({
			loadVerses,
			onOpen: (verse) =>
				void navigate({ search: { passage: verse.passageId }, to: "/bible" }),
		}),
		[loadVerses, navigate],
	);
	const editLink = (focus?: NoteEditorFocus) =>
		({
			params: { noteId: note.id },
			search: { focus },
			to: "/library/notes/$noteId/edit",
		}) as const;

	return (
		<VerseBlockProvider value={verseSource}>
			<div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-border-subtle border-b bg-card/95 px-5 py-3 backdrop-blur sm:px-8">
				{leading}
				<p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-sm">
					{note.status === "draft" ? <DraftTag /> : null}
					<span>
						{formatEdited(note.updatedAt)} · {getWordCount(note.content)} words
						· {getEstimatedReadingTime(note.content)} min read
					</span>
				</p>
				<div className="ml-auto flex items-center gap-1">
					<IconAction label={isPinned ? "Unpin note" : "Pin note"}>
						<Button
							aria-pressed={isPinned}
							className="size-10 rounded-[10px] text-secondary-foreground"
							disabled={actions.pin.isPending}
							onClick={() =>
								actions.pin.mutate({ id: note.id, pinned: !isPinned })
							}
							size="icon"
							type="button"
							variant="ghost"
						>
							{isPinned ? (
								<PinOffIcon aria-hidden="true" />
							) : (
								<PinIcon aria-hidden="true" />
							)}
						</Button>
					</IconAction>
					<DropdownMenu>
						<IconAction label="Share or export">
							<DropdownMenuTrigger
								render={
									<Button
										className="size-10 rounded-[10px] text-secondary-foreground"
										size="icon"
										type="button"
										variant="ghost"
									/>
								}
							>
								<ShareIcon aria-hidden="true" />
							</DropdownMenuTrigger>
						</IconAction>
						<DropdownMenuContent align="end" className="min-w-48">
							<DropdownMenuItem onClick={() => void copyNoteText(note)}>
								<CopyIcon aria-hidden="true" />
								Copy as text
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => window.print()}>
								<PrinterIcon aria-hidden="true" />
								Print or save as PDF
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<DropdownMenu>
						<IconAction label="More actions">
							<DropdownMenuTrigger
								render={
									<Button
										className="size-10 rounded-[10px] text-secondary-foreground"
										size="icon"
										type="button"
										variant="ghost"
									/>
								}
							>
								<EllipsisIcon aria-hidden="true" />
							</DropdownMenuTrigger>
						</IconAction>
						<DropdownMenuContent align="end" className="min-w-48">
							<DropdownMenuItem onClick={() => setCollectionsOpen(true)}>
								<FolderPlusIcon aria-hidden="true" />
								Add to collection
							</DropdownMenuItem>
							<DropdownMenuItem
								disabled={actions.duplicate.isPending}
								onClick={() =>
									actions.duplicate.mutate(
										{
											content: note.content,
											passageIds: note.passages.map((passage) => passage.id),
											purpose: note.purpose,
											tags: note.tags.map((tag) => tag.name),
											title: note.title,
										},
										{ onSuccess: (copy) => onDuplicated(copy.id) },
									)
								}
							>
								<CopyIcon aria-hidden="true" />
								Duplicate
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => setConfirmDeleteOpen(true)}
							>
								<Trash2Icon aria-hidden="true" />
								Delete note
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button
						className="ml-1 h-10 rounded-[10px] px-4 font-semibold"
						nativeButton={false}
						render={<Link {...editLink()} />}
					>
						<PencilIcon aria-hidden="true" data-icon="inline-start" />
						Edit
					</Button>
				</div>
			</div>

			<article
				aria-labelledby={note.title ? "note-reading-title" : undefined}
				aria-label={note.title ? undefined : "Untitled note"}
				className="mx-auto flex w-full max-w-190 flex-col gap-6 px-5 pt-10 pb-16 sm:px-8"
				data-print-note
			>
				<header className="flex flex-col gap-4">
					{note.title ? (
						<h2
							className="font-medium font-serif text-[2.5rem] leading-[1.15] tracking-[-0.015em]"
							id="note-reading-title"
						>
							{note.title}
						</h2>
					) : (
						<Link
							className="w-fit rounded-md font-serif text-[2.5rem] text-muted-foreground italic leading-[1.15] hover:text-secondary-foreground print:hidden"
							{...editLink("title")}
						>
							Add a title
						</Link>
					)}
					<div className="flex flex-wrap items-center gap-2">
						{note.passages.map((passage) => (
							<Link
								className="flex h-9 items-center gap-2 rounded-full border border-scripture-border bg-scripture px-3.5 font-serif text-[15px] text-scripture-foreground hover:bg-scripture-border/50"
								key={passage.id}
								search={{ passage: passage.id }}
								to="/bible"
							>
								<BookOpenIcon aria-hidden="true" className="size-3.5" />
								{passage.label}
							</Link>
						))}
						{note.purpose ? (
							<span className="flex h-9 items-center rounded-full bg-secondary px-3.5 text-secondary-foreground text-sm">
								{purposeLabel(note.purpose)}
							</span>
						) : null}
						{note.passages.length ? null : (
							<MissingDetail focus="passage" noteId={note.id}>
								Link a passage
							</MissingDetail>
						)}
						{note.purpose ? null : (
							<MissingDetail focus="purpose" noteId={note.id}>
								Set purpose
							</MissingDetail>
						)}
					</div>
				</header>

				<RichTextRenderer
					ariaLabel="Note content"
					contentClassName="text-[21px]! text-body-foreground leading-[1.7]! [&_.ProseMirror]:max-w-none! [&_.ProseMirror]:px-0! [&_.ProseMirror]:py-0!"
					document={note.content}
					variant="plain"
				/>

				<footer className="flex flex-wrap items-center gap-2 border-border-subtle border-t pt-5 text-sm">
					<TagIcon
						aria-hidden="true"
						className="size-4 text-muted-foreground"
					/>
					{note.tags.length ? (
						<ul aria-label="Tags" className="flex flex-wrap gap-1.5">
							{note.tags.map((tag) => (
								<li
									className="flex h-8 items-center rounded-lg bg-section-observe px-2.5 font-medium text-[13px] text-section-observe-foreground"
									key={tag.id}
								>
									{tag.name}
								</li>
							))}
						</ul>
					) : (
						<span className="flex items-center gap-2 text-muted-foreground print:hidden">
							<Link
								className="rounded-sm underline-offset-4 hover:text-foreground hover:underline"
								{...editLink("tags")}
							>
								Add tags
							</Link>
							<span aria-hidden="true">·</span>
							<button
								className="rounded-sm underline-offset-4 hover:text-foreground hover:underline"
								onClick={() => setCollectionsOpen(true)}
								type="button"
							>
								Add to collection
							</button>
						</span>
					)}
				</footer>
			</article>

			<AddNoteToCollectionDialog
				noteId={note.id}
				onOpenChange={setCollectionsOpen}
				open={collectionsOpen}
			/>
			<AlertDialog onOpenChange={setConfirmDeleteOpen} open={confirmDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this note?</AlertDialogTitle>
						<AlertDialogDescription>
							The note will be removed from your library and any collections.
							This can’t be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{actions.remove.isError ? (
						<p className="text-destructive text-sm" role="alert">
							Unable to delete this note. Please try again.
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={actions.remove.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={actions.remove.isPending}
							onClick={() =>
								actions.remove.mutate(note.id, {
									onSuccess: () => {
										setConfirmDeleteOpen(false);
										onDeleted();
									},
								})
							}
							variant="destructive"
						>
							{actions.remove.isPending ? "Deleting…" : "Delete note"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</VerseBlockProvider>
	);
}

/** Icon-only controls get a tooltip as well as their label. */
function IconAction({
	children,
	label,
}: {
	children: ReactElement<{ "aria-label"?: string }>;
	label: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger aria-label={label} render={children} />
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

/** A dashed prompt for a detail the note doesn't have yet. */
function MissingDetail({
	children,
	focus,
	noteId,
}: {
	children: ReactNode;
	focus: NoteEditorFocus;
	noteId: number;
}) {
	return (
		<Link
			className="flex h-9 items-center gap-1.5 rounded-full border border-muted-foreground/40 border-dashed px-3.5 text-secondary-foreground text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 print:hidden"
			params={{ noteId }}
			search={{ focus }}
			to="/library/notes/$noteId/edit"
		>
			<PlusIcon aria-hidden="true" className="size-3.5" />
			{children}
		</Link>
	);
}
