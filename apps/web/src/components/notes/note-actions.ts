import type { RichTextDocument } from "@berean-study/rich-text-editor";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { deleteNote, saveNote, setNotePinned } from "@/functions/notes";
import { noteKeys } from "@/queries/keys";
import { invalidateNoteQueries } from "@/queries/notes";

import { noteToPlainText } from "./note-export";
import type { SavedNote } from "./note-save-lifecycle";

export type NoteCopySource = {
	content: RichTextDocument;
	passageIds: number[];
	purpose: SavedNote["purpose"];
	tags: string[];
	title: string;
};

/** Saves a new draft with the same content, passages, purpose and tags. */
export async function duplicateNote(note: NoteCopySource) {
	const title = note.title.trim();
	const copy = await saveNote({
		data: {
			content: note.content,
			passageIds: note.passageIds,
			purpose: note.purpose,
			tags: note.tags,
			title: title ? `${title} (copy)` : "",
		},
	});
	if (!copy) throw new Error("Note not found.");
	return copy;
}

/** Pin, duplicate and delete, with the cache updates and messages each needs. */
export function useNoteActions() {
	const queryClient = useQueryClient();

	const pin = useMutation({
		mutationFn: async ({ id, pinned }: { id: number; pinned: boolean }) => {
			if (!(await setNotePinned({ data: { id, pinned } })))
				throw new Error("Note not found.");
		},
		onSuccess: (_result, { pinned }) => {
			toast.success(pinned ? "Note pinned." : "Note unpinned.");
			return queryClient.invalidateQueries({ queryKey: noteKeys.all });
		},
		onError: () => toast.error("Unable to update this note. Please try again."),
	});

	const duplicate = useMutation({
		mutationFn: duplicateNote,
		onSuccess: () => {
			toast.success("Note duplicated.");
			return invalidateNoteQueries(queryClient);
		},
		onError: () =>
			toast.error("Unable to duplicate this note. Please try again."),
	});

	const remove = useMutation({
		mutationFn: async (id: number) => {
			if (!(await deleteNote({ data: { id } })))
				throw new Error("Note not found.");
		},
		onSuccess: (_result, id) => {
			toast.success("Note deleted.");
			queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
			return invalidateNoteQueries(queryClient);
		},
	});

	return { duplicate, pin, remove };
}

export async function copyNoteText(note: {
	content: RichTextDocument;
	title: string;
}) {
	try {
		await navigator.clipboard.writeText(
			noteToPlainText(note.title, note.content),
		);
		toast.success("Note copied as text.");
	} catch {
		toast.error("Your browser didn’t allow copying. Please try again.");
	}
}
