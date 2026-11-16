import {
	hasRichTextContent,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveNote } from "@/functions/notes";
import { useAutosave, useOrderedSave } from "@/lib/use-autosave";
import { invalidateNoteQueries } from "@/queries/notes";
import { formatTime } from "@/utils/dates";

export type SavedNote = NonNullable<Awaited<ReturnType<typeof saveNote>>>;

export type NoteFormValues = {
	content: RichTextDocument;
	/** Linked passages in display order; the first is the main passage. */
	passageIds: number[];
	purpose: SavedNote["purpose"];
	tags: string[];
	title: string;
};
export type NoteStatus = SavedNote["status"];
export type StoredNote = Pick<
	SavedNote,
	"createdAt" | "id" | "status" | "updatedAt"
>;
export type NoteSaveState =
	| "failed"
	| "pending"
	| "saved"
	| "saving"
	| "untouched";

/**
 * Keeps every save for one note in order and turns a newly created note into
 * subsequent updates. Pages only decide what to do after a save succeeds.
 */
export function useNoteSaveLifecycle(initialNote?: StoredNote) {
	const queryClient = useQueryClient();
	const noteId = useRef<number | undefined>(initialNote?.id);
	const [storedNote, setStoredNote] = useState<StoredNote | null>(
		initialNote ?? null,
	);

	// Saves run in order, so a later save reads the id an earlier one created.
	const ordered = useOrderedSave(
		async ({
			status,
			values,
		}: {
			status?: NoteStatus;
			values: NoteFormValues;
		}): Promise<SavedNote> => {
			const savedNote = await saveNote({
				data: {
					content: values.content,
					id: noteId.current,
					passageIds: values.passageIds,
					purpose: values.purpose,
					status,
					tags: values.tags,
					title: values.title.trim(),
				},
			});
			if (!savedNote) throw new Error("Note not found.");

			noteId.current = savedNote.id;
			setStoredNote(savedNote);
			// The form is the source of truth while editing, so mark the cached
			// copies stale for their next use rather than refetching every save.
			void invalidateNoteQueries(queryClient, { refetchType: "none" });
			return savedNote;
		},
	);
	const { save: runSave, whenIdle: whenSavesFinish } = ordered;

	const save = useCallback(
		(values: NoteFormValues, options: { status?: NoteStatus } = {}) =>
			runSave({ status: options.status, values }),
		[runSave],
	);

	/** Resolves with the note's id once every queued save has settled. */
	const whenIdle = useCallback(async () => {
		await whenSavesFinish();
		return noteId.current;
	}, [whenSavesFinish]);

	return { markStored: setStoredNote, save, storedNote, whenIdle };
}

/**
 * Saves changes about a second after typing stops. Drafts save without a
 * title; a note that has left draft keeps its required title.
 */
export function useNoteAutosave({
	initialValues,
	isManualSaveInProgress,
	noteStatus,
	onSave,
	values,
}: {
	initialValues: NoteFormValues;
	isManualSaveInProgress: boolean;
	noteStatus: NoteStatus | null;
	onSave: (values: NoteFormValues) => Promise<unknown>;
	values: NoteFormValues;
}) {
	const canAutosave = isValidForAutosave(values, noteStatus);
	const autosave = useAutosave({
		canSave: canAutosave,
		delayMs: 1000,
		initialValues,
		isEqual: areValuesEqual,
		paused: isManualSaveInProgress,
		save: onSave,
		values,
	});
	// A note saved before this visit counts as saved until something changes.
	const state: NoteSaveState =
		autosave.state === "idle"
			? noteStatus
				? "saved"
				: "untouched"
			: autosave.state;

	return {
		canAutosave,
		lastSavedAt: autosave.lastSavedAt,
		markSaved: autosave.markSaved,
		retry: autosave.retry,
		state,
	};
}

export function NoteSaveStatus({
	canAutosave,
	lastSavedAt,
	noteStatus,
	onRetry,
	state,
}: {
	canAutosave: boolean;
	lastSavedAt: Date | null;
	noteStatus: NoteStatus | null;
	onRetry: () => void;
	state: NoteSaveState;
}) {
	const now = useNow(30_000);
	const savedLabel = noteStatus === "saved" ? "Saved" : "Draft saved";

	return (
		<div
			aria-live="polite"
			className="flex min-h-9 items-center gap-2 text-muted-foreground text-sm"
			role="status"
		>
			{state === "failed" ? (
				<button
					className="rounded-sm text-destructive underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					onClick={onRetry}
					type="button"
				>
					Couldn’t save — retry
				</button>
			) : state === "saving" || (state === "pending" && canAutosave) ? (
				<span>Saving…</span>
			) : state === "saved" ? (
				<span className="flex items-center gap-2 text-success">
					<CheckIcon aria-hidden="true" className="size-4" />
					{savedLabel}
					{lastSavedAt ? ` · ${formatSavedAgo(lastSavedAt, now)}` : null}
				</span>
			) : state === "pending" && noteStatus !== null ? (
				<span>
					{noteStatus === "saved"
						? "Add a title to save changes"
						: "Unsaved changes"}
				</span>
			) : (
				<span className="flex items-center gap-2">
					<span
						aria-hidden="true"
						className="size-2 rounded-full bg-muted-foreground/50"
					/>
					Draft · autosaves as you write
				</span>
			)}
		</div>
	);
}

export function formatSavedAgo(savedAt: Date, now: Date) {
	const minutes = Math.floor((now.getTime() - savedAt.getTime()) / 60_000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} min ago`;
	return `at ${formatTime(savedAt)}`;
}

function useNow(intervalMs: number) {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const intervalId = window.setInterval(() => setNow(new Date()), intervalMs);
		return () => window.clearInterval(intervalId);
	}, [intervalMs]);
	return now;
}

export function areValuesEqual(left: NoteFormValues, right: NoteFormValues) {
	return (
		JSON.stringify(left.content) === JSON.stringify(right.content) &&
		left.title === right.title &&
		left.purpose === right.purpose &&
		haveSameItems(left.passageIds, right.passageIds) &&
		haveSameItems(left.tags, right.tags)
	);
}

function haveSameItems<T>(left: readonly T[], right: readonly T[]) {
	return (
		left.length === right.length &&
		left.every((item, index) => item === right[index])
	);
}

function isValidForAutosave(
	values: NoteFormValues,
	noteStatus: NoteStatus | null,
) {
	if (!hasRichTextContent(values.content)) return false;
	return noteStatus !== "saved" || Boolean(values.title.trim());
}
