"use client";

import { getDocumentText } from "@berean-study/rich-text-editor";
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
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import {
	type QueryKey,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { EllipsisIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { removeNoteFromCollection } from "@/functions/collections";
import { deleteNote } from "@/functions/notes";
import { collectionKeys, libraryKeys, noteKeys } from "@/queries/keys";

import type { CollectionNote } from "./use-collection-actions";

/** The Notes tab: every note in the collection, with remove and delete. */
export function CollectionNotes({
	collectionId,
	notes,
}: {
	collectionId: number;
	notes: readonly CollectionNote[];
}) {
	const queryClient = useQueryClient();
	const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
	const invalidate = (...queryKeys: QueryKey[]) =>
		Promise.all(
			[collectionKeys.all, libraryKeys.all, ...queryKeys].map((queryKey) =>
				queryClient.invalidateQueries({ queryKey }),
			),
		);
	const removeMutation = useMutation({
		mutationFn: async (noteId: number) => {
			const removed = await removeNoteFromCollection({
				data: { id: collectionId, noteId },
			});
			if (!removed) throw new Error("Note membership not found.");
		},
		onSuccess: () => invalidate(noteKeys.lists()),
	});
	const deleteMutation = useMutation({
		mutationFn: async (noteId: number) => {
			const deleted = await deleteNote({ data: { id: noteId } });
			if (!deleted) throw new Error("Note not found.");
		},
		onSuccess: async () => {
			setDeleteNoteId(null);
			await invalidate(noteKeys.all);
		},
	});
	const error = removeMutation.isError
		? "We couldn't remove this note from the collection."
		: deleteMutation.isError
			? "We couldn't delete this note. Please try again."
			: null;

	if (!notes.length) {
		return (
			<Empty className="rounded-2xl border border-border bg-card py-12">
				<EmptyHeader>
					<EmptyTitle className="font-serif text-xl">No notes yet</EmptyTitle>
					<EmptyDescription className="max-w-md text-sm">
						Add a note from a passage&apos;s “Up next” card, or add any note to
						this collection from the note itself.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-border bg-card">
			{error ? (
				<p
					className="border-border-subtle border-b px-5 py-3 text-destructive text-sm"
					role="alert"
				>
					{error}
				</p>
			) : null}
			<ul aria-label="Notes in this collection">
				{notes.map((note) => (
					<li
						className="flex items-start justify-between gap-4 border-border-subtle border-b px-5 py-4 last:border-b-0"
						key={note.id}
					>
						<Link
							className="min-w-0 flex-1 rounded-md outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
							params={{ noteId: note.id }}
							to="/library/notes/$noteId"
						>
							<p className="font-semibold">
								{note.title || note.passageTitle || "Untitled note"}
							</p>
							<p className="mt-1 line-clamp-3 whitespace-pre-wrap text-muted-foreground leading-6">
								{getDocumentText(note.content)}
							</p>
						</Link>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										aria-label={`Options for ${note.title || "this note"}`}
										className="size-11 rounded-lg text-muted-foreground"
										type="button"
										variant="ghost"
									/>
								}
							>
								<EllipsisIcon aria-hidden="true" className="size-5" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									disabled={removeMutation.isPending}
									onClick={() => removeMutation.mutate(note.id)}
								>
									<Trash2Icon aria-hidden="true" />
									Remove from collection
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setDeleteNoteId(note.id)}
									variant="destructive"
								>
									<Trash2Icon aria-hidden="true" />
									Delete note
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</li>
				))}
			</ul>
			<AlertDialog
				onOpenChange={(next) => {
					if (!next && !deleteMutation.isPending) setDeleteNoteId(null);
				}}
				open={deleteNoteId !== null}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this note?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently deletes the note from all of its collections.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleteMutation.isPending}
							onClick={() => {
								if (deleteNoteId) deleteMutation.mutate(deleteNoteId);
							}}
							variant="destructive"
						>
							{deleteMutation.isPending ? "Deleting…" : "Delete note"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
