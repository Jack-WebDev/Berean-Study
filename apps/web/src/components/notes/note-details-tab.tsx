import {
	getEstimatedReadingTime,
	getLinkedVerseCount,
	getWordCount,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	CheckIcon,
	ChevronDownIcon,
	CopyIcon,
	DownloadIcon,
	FolderIcon,
	LockIcon,
	Trash2Icon,
	UsersRoundIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { AddNoteToCollectionDialog } from "@/components/collections/add-note-to-collection-dialog";
import { formatDate } from "@/lib/format";
import { communityPublishingResourcesQueryOptions } from "@/queries/community";
import { noteVersionsQueryOptions } from "@/queries/notes";

import { dateGroupLabel, formatListTime } from "./note-library";
import type { StoredNote } from "./note-save-lifecycle";
import { type PassageOption, useNotesForPassage } from "./note-study-data";

const eyebrowClassName =
	"font-semibold text-muted-foreground text-xs uppercase tracking-[0.06em]";

export function NoteDetailsTab({
	document,
	isRestoring,
	mainPassage,
	onDelete,
	onDuplicate,
	onExport,
	onRestoreVersion,
	storedNote,
}: {
	document: RichTextDocument;
	isRestoring: boolean;
	mainPassage: PassageOption | null;
	onDelete: () => void;
	onDuplicate: () => void;
	onExport: () => void;
	onRestoreVersion: (versionId: number) => void;
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
				<VisibilityControl storedNote={storedNote} />
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

			{storedNote ? (
				<VersionHistory
					isRestoring={isRestoring}
					noteId={storedNote.id}
					onRestore={onRestoreVersion}
					updatedAt={storedNote.updatedAt}
				/>
			) : null}

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

/**
 * Notes are always private. Sharing publishes a copy to Community, so this
 * shows whether a copy exists and offers to share one.
 */
function VisibilityControl({ storedNote }: { storedNote: StoredNote | null }) {
	const navigate = useNavigate();
	const resources = useQuery({
		...communityPublishingResourcesQueryOptions(),
		enabled: Boolean(storedNote),
	});
	const isShared = Boolean(
		storedNote &&
			resources.data?.some(
				(resource) =>
					resource.type === "note" &&
					resource.id === storedNote.id &&
					resource.isPublished,
			),
	);

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between gap-3 text-sm">
				<span className="text-secondary-foreground">Visibility</span>
				<DropdownMenu>
					<DropdownMenuTrigger
						disabled={!storedNote}
						render={
							<Button
								className="h-9 rounded-lg text-[13px]"
								type="button"
								variant="outline"
							/>
						}
					>
						{isShared ? (
							<UsersRoundIcon aria-hidden="true" data-icon="inline-start" />
						) : (
							<LockIcon aria-hidden="true" data-icon="inline-start" />
						)}
						{isShared ? "Shared copy" : "Private"}
						<ChevronDownIcon aria-hidden="true" data-icon="inline-end" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-56">
						<DropdownMenuItem disabled>
							<CheckIcon aria-hidden="true" />
							Private — only you can edit it
						</DropdownMenuItem>
						{isShared ? (
							<DropdownMenuItem
								onClick={() => void navigate({ to: "/community" })}
							>
								<UsersRoundIcon aria-hidden="true" />
								View in Community
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem
								onClick={() =>
									storedNote &&
									void navigate({
										search: { source: storedNote.id, type: "note" },
										to: "/community/share",
									})
								}
							>
								<UsersRoundIcon aria-hidden="true" />
								Share to Community…
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<p className="text-right text-muted-foreground text-xs">
				{!storedNote
					? "Only you can see this note. It saves as you write."
					: isShared
						? "A copy is shared in Community. This note stays yours."
						: "Only you can see this note. Share it to Community any time."}
			</p>
		</div>
	);
}

const VISIBLE_VERSIONS = 6;

/** Autosaved versions, newest first; restoring one keeps the rest. */
function VersionHistory({
	isRestoring,
	noteId,
	onRestore,
	updatedAt,
}: {
	isRestoring: boolean;
	noteId: number;
	onRestore: (versionId: number) => void;
	updatedAt: Date | string;
}) {
	const versions = useQuery(noteVersionsQueryOptions(noteId));
	const [showAll, setShowAll] = useState(false);
	const list = versions.data ?? [];
	// Edits since the last version are the current state, shown on top.
	const rows = [
		...(list.some((version) => version.isCurrent)
			? []
			: [{ createdAt: updatedAt, id: 0, isCurrent: true, summary: null }]),
		...list,
	];
	const shownRows = showAll ? rows : rows.slice(0, VISIBLE_VERSIONS);

	return (
		<section
			aria-labelledby="note-details-history"
			className="flex flex-col gap-2 border-border border-t pt-4"
		>
			<h3 className={eyebrowClassName} id="note-details-history">
				Version history
			</h3>
			{versions.isPending ? (
				<p className="text-muted-foreground text-sm">Loading versions…</p>
			) : versions.isError ? (
				<p className="text-muted-foreground text-sm">
					Version history couldn’t be loaded.
				</p>
			) : (
				<ol className="flex flex-col">
					{shownRows.map((version, index) => (
						<li
							className="relative flex min-h-11 items-center gap-3 pl-5"
							key={version.id}
						>
							<span
								aria-hidden="true"
								className={`absolute top-1/2 left-0.5 size-2 -translate-y-1/2 rounded-full ${version.isCurrent ? "bg-primary" : "bg-border-strong"}`}
							/>
							{index < shownRows.length - 1 ? (
								<span
									aria-hidden="true"
									className="absolute top-1/2 bottom-[-50%] left-[5px] w-px bg-border"
								/>
							) : null}
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="text-sm">
									{formatVersionTime(version.createdAt)}
								</span>
								<span className="truncate text-muted-foreground text-xs">
									{version.isCurrent
										? "Current version"
										: describeVersion(version.summary)}
								</span>
							</span>
							{version.isCurrent ? null : (
								<Button
									aria-label={`Restore the version from ${formatVersionTime(version.createdAt)}`}
									className="h-9 rounded-lg"
									disabled={isRestoring}
									onClick={() => onRestore(version.id)}
									type="button"
									variant="outline"
								>
									Restore
								</Button>
							)}
						</li>
					))}
				</ol>
			)}
			{rows.length > VISIBLE_VERSIONS && !showAll ? (
				<Button
					className="h-9 self-start rounded-lg"
					onClick={() => setShowAll(true)}
					type="button"
					variant="ghost"
				>
					Show {rows.length - VISIBLE_VERSIONS} older
				</Button>
			) : null}
		</section>
	);
}

function formatVersionTime(value: Date | string) {
	const date = new Date(value);
	if (Date.now() - date.getTime() < 60_000) return "Just now";
	return dateGroupLabel(date) === "Today"
		? formatListTime(date)
		: formatTimestamp(date);
}

/** Labels stored summaries the way the timeline reads: "Autosave · added Apply". */
function describeVersion(summary: string | null) {
	if (!summary) return "Autosave";
	if (summary.startsWith("Added "))
		return `Autosave · added ${summary.slice("Added ".length)}`;
	return summary;
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
		notes.data?.filter((note) => note.id !== currentNoteId).slice(0, 5) ?? [];

	return (
		<section
			aria-labelledby="note-details-related"
			className="flex flex-col gap-2 border-border border-t pt-4"
		>
			<h3 className={eyebrowClassName} id="note-details-related">
				Your other notes on {passage.label}
			</h3>
			{notes.isSuccess && otherNotes.length ? (
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
					{notes.isSuccess
						? "None yet. Notes on this passage will gather here so you can see how your understanding grows."
						: notes.isError
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
