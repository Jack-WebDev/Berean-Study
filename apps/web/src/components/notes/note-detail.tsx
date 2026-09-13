import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@berean-study/ui/components/alert";
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
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import {
	ArrowLeftIcon,
	BookOpenIcon,
	FileTextIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";

import { formatDate } from "@/lib/format";
import { NoteCollectionControl } from "./note-collection";
import { NoteTags } from "./note-tags";
import { passageLabel } from "./notes-list";
import type { Note, NoteCollection } from "./types";

export function NoteDetail({
	note,
	onDelete,
	onEdit,
	onAddTag,
	collections,
	onAssignCollection,
	onCreateCollection,
	onRemoveTag,
	onReturnToScripture,
}: {
	note: Note | null;
	onDelete: (noteId: number) => Promise<void>;
	onEdit: (noteId: number) => void;
	onAddTag: (noteId: number, name: string) => Promise<void>;
	collections: NoteCollection[];
	onAssignCollection: (
		noteId: number,
		collectionId: number | null,
	) => Promise<void>;
	onCreateCollection: (name: string) => Promise<NoteCollection>;
	onRemoveTag: (noteId: number, tagId: number) => Promise<void>;
	onReturnToScripture?: () => void;
}) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	if (!note) {
		return (
			<Empty className="border-0">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<FileTextIcon aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle>Select a note to read it</EmptyTitle>
					<EmptyDescription>
						The selected note will be shown here with its Scripture context.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<article aria-labelledby="note-detail-title" className="notes-note-detail">
			<header className="notes-note-header">
				<div className="mb-4 flex flex-wrap gap-2 sm:justify-end">
					{onReturnToScripture ? (
						<Button
							onClick={onReturnToScripture}
							size="sm"
							type="button"
							variant="ghost"
						>
							<ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
							Scripture
						</Button>
					) : null}
					<Button
						onClick={() => onEdit(note.id)}
						size="sm"
						type="button"
						variant="outline"
					>
						<PencilIcon aria-hidden="true" data-icon="inline-start" />
						Edit
					</Button>
					<Button
						onClick={() => setDeleteDialogOpen(true)}
						size="sm"
						type="button"
						variant="destructive"
					>
						<Trash2Icon aria-hidden="true" data-icon="inline-start" />
						Delete
					</Button>
				</div>
				<h1 className="notes-note-title" id="note-detail-title">
					{note.content.split(/\n|\./)[0].trim() || "Untitled note"}
				</h1>
				<p className="notes-note-passage">
					<BookOpenIcon aria-hidden="true" />
					{passageLabel(note)}
				</p>
				<div className="notes-note-tags">
					{note.tags.map((tag) => (
						<span key={tag.id}>{tag.name}</span>
					))}
				</div>
			</header>
			<div className="notes-note-content whitespace-pre-wrap">
				{note.content}
			</div>
			<NoteTags
				onAdd={(name) => onAddTag(note.id, name)}
				onRemove={(tagId) => onRemoveTag(note.id, tagId)}
				tags={note.tags}
			/>
			<NoteCollectionControl
				collectionId={note.collectionId}
				collections={collections}
				onAssign={(collectionId) => onAssignCollection(note.id, collectionId)}
				onCreate={onCreateCollection}
			/>

			<AlertDialog
				onOpenChange={(open) => {
					setDeleteDialogOpen(open);
					if (!open) setDeleteError(null);
				}}
				open={deleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this note?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently removes your note. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deleteError ? (
						<Alert variant="destructive">
							<AlertTitle>Unable to delete note</AlertTitle>
							<AlertDescription>{deleteError}</AlertDescription>
						</Alert>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={isDeleting}
							onClick={() => {
								setDeleteError(null);
								setIsDeleting(true);
								void onDelete(note.id)
									.then(() => setDeleteDialogOpen(false))
									.catch(() =>
										setDeleteError(
											"Unable to delete this note. Please try again.",
										),
									)
									.finally(() => setIsDeleting(false));
							}}
							variant="destructive"
						>
							{isDeleting ? "Deleting…" : "Delete note"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</article>
	);
}
