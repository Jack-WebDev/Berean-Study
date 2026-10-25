import {
	getEstimatedReadingTime,
	getLinkedVerseCount,
	getWordCount,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
	CopyIcon,
	DownloadIcon,
	FolderIcon,
	LockIcon,
	Trash2Icon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { AddNoteToCollectionDialog } from "@/components/collections/add-note-to-collection-dialog";
import { formatDate } from "@/lib/format";

import type { StoredNote } from "./note-save-lifecycle";
import { type PassageOption, useNotesForPassage } from "./note-study-data";

const eyebrowClassName =
	"font-semibold text-muted-foreground text-xs uppercase tracking-[0.06em]";

export function NoteDetailsTab({
	document,
	mainPassage,
	onDelete,
	onDuplicate,
	onExport,
	storedNote,
}: {
	document: RichTextDocument;
	mainPassage: PassageOption | null;
	onDelete: () => void;
	onDuplicate: () => void;
	onExport: () => void;
	storedNote: StoredNote | null;
}) {
	const [collectionsOpen, setCollectionsOpen] = useState(false);
	const wordCount = getWordCount(document);
	const readingTime = getEstimatedReadingTime(document);

	return (
		<div className="flex flex-col gap-5">
			<section
				aria-labelledby="note-details-organise"
				className="flex flex-col gap-3"
			>
				<h3 className={eyebrowClassName} id="note-details-organise">
					Organise
				</h3>
				<div className="flex items-center justify-between gap-3 text-sm">
					<span className="text-secondary-foreground">Collection</span>
					<Button
						className="h-9 rounded-lg"
						disabled={!storedNote}
						onClick={() => setCollectionsOpen(true)}
						type="button"
						variant="outline"
					>
						<FolderIcon aria-hidden="true" data-icon="inline-start" />
						Add to collection
					</Button>
				</div>
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="text-secondary-foreground">Visibility</span>
						<span className="flex h-9 items-center gap-1.5 text-[13px] text-secondary-foreground">
							<LockIcon aria-hidden="true" className="size-3.5" />
							Private
						</span>
					</div>
					<p className="text-right text-muted-foreground text-xs">
						{storedNote
							? "Only you can see this note."
							: "Only you can see this note. It saves as you write."}
					</p>
				</div>
			</section>

			<section
				aria-labelledby="note-details-about"
				className="flex flex-col gap-2.5 border-border border-t pt-4"
			>
				<h3 className={eyebrowClassName} id="note-details-about">
					About this note
				</h3>
				<div className="grid grid-cols-2 gap-2">
					<StatTile label="words" value={wordCount} />
					<StatTile label="reading time" value={`${readingTime} min`} />
				</div>
				<dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
					<DetailRow label="Created">
						{storedNote
							? formatTimestamp(storedNote.createdAt)
							: "Not saved yet"}
					</DetailRow>
					<DetailRow label="Last edited">
						{storedNote ? formatTimestamp(storedNote.updatedAt) : "—"}
					</DetailRow>
					<DetailRow label="Linked verses">
						{getLinkedVerseCount(document)}
					</DetailRow>
				</dl>
			</section>

			{mainPassage ? (
				<OtherNotesOnPassage
					currentNoteId={storedNote?.id ?? null}
					passage={mainPassage}
				/>
			) : null}

			<section
				aria-label="Note actions"
				className="flex flex-wrap gap-2 border-border border-t pt-4"
			>
				<Button
					className="h-9 rounded-[9px]"
					disabled={!storedNote}
					onClick={onExport}
					type="button"
					variant="outline"
				>
					<DownloadIcon aria-hidden="true" data-icon="inline-start" />
					Export
				</Button>
				<Button
					className="h-9 rounded-[9px]"
					disabled={!storedNote}
					onClick={onDuplicate}
					type="button"
					variant="outline"
				>
					<CopyIcon aria-hidden="true" data-icon="inline-start" />
					Duplicate
				</Button>
				<Button
					className="ml-auto h-9 rounded-[9px] bg-transparent text-destructive hover:bg-destructive/10"
					disabled={!storedNote}
					onClick={onDelete}
					type="button"
					variant="ghost"
				>
					<Trash2Icon aria-hidden="true" data-icon="inline-start" />
					Delete
				</Button>
			</section>
			{storedNote ? (
				<AddNoteToCollectionDialog
					noteId={storedNote.id}
					onOpenChange={setCollectionsOpen}
					open={collectionsOpen}
				/>
			) : null}
		</div>
	);
}

function OtherNotesOnPassage({
	currentNoteId,
	passage,
}: {
	currentNoteId: number | null;
	passage: PassageOption;
}) {
	const notes = useNotesForPassage(passage.id);
	const otherNotes =
		notes.status === "ready"
			? notes.value.filter((note) => note.id !== currentNoteId).slice(0, 5)
			: [];

	return (
		<section
			aria-labelledby="note-details-related"
			className="flex flex-col gap-2 border-border border-t pt-4"
		>
			<h3 className={eyebrowClassName} id="note-details-related">
				Your other notes on {passage.label}
			</h3>
			{notes.status === "ready" && otherNotes.length ? (
				<ul className="flex flex-col gap-1">
					{otherNotes.map((note) => (
						<li key={note.id}>
							<Link
								className="flex min-h-10 items-center rounded-[10px] bg-background px-2.5 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
								params={{ noteId: note.id }}
								to="/library/notes/$noteId/edit"
							>
								<span className="truncate">
									{note.title || "Untitled note"}
								</span>
							</Link>
						</li>
					))}
				</ul>
			) : (
				<p className="text-secondary-foreground text-sm leading-normal">
					{notes.status === "ready"
						? "None yet. Notes on this passage will gather here so you can see how your understanding grows."
						: notes.status === "failed"
							? "Your other notes couldn’t be loaded."
							: "Loading your notes…"}
				</p>
			)}
		</section>
	);
}

function StatTile({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="flex flex-col gap-0.5 rounded-[10px] bg-background px-3 py-2.5">
			<span className="font-serif text-xl">{value}</span>
			<span className="text-muted-foreground text-xs">{label}</span>
		</div>
	);
}

function DetailRow({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	return (
		<>
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="m-0 text-right">{children}</dd>
		</>
	);
}

function formatTimestamp(value: Date | string) {
	return formatDate(value, { dateStyle: "medium", timeStyle: "short" });
}
