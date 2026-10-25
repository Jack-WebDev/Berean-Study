import {
	hasRichTextContent,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";
import { CheckIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveNote } from "@/functions/notes";

export type NoteFormValues = {
	content: RichTextDocument;
	/** Linked passages in display order; the first is the main passage. */
	passageIds: number[];
	tags: string[];
	title: string;
};

export type SavedNote = NonNullable<Awaited<ReturnType<typeof saveNote>>>;
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

const AUTOSAVE_DELAY_MS = 1000;

/**
 * Keeps every save for one note in order and turns a newly created note into
 * subsequent updates. Pages only decide what to do after a save succeeds.
 */
export function useNoteSaveLifecycle(initialNote?: StoredNote) {
	const noteId = useRef<number | undefined>(initialNote?.id);
	const saveQueue = useRef<Promise<void>>(Promise.resolve());
	const [storedNote, setStoredNote] = useState<StoredNote | null>(
		initialNote ?? null,
	);

	const save = useCallback(
		(
			values: NoteFormValues,
			options: { status?: NoteStatus } = {},
		): Promise<SavedNote> => {
			const nextSave = saveQueue.current.then(async () => {
				const savedNote = await saveNote({
					data: {
						content: values.content,
						id: noteId.current,
						passageIds: values.passageIds,
						status: options.status,
						tags: values.tags,
						title: values.title.trim(),
					},
				});
				if (!savedNote) throw new Error("Note not found.");

				noteId.current = savedNote.id;
				setStoredNote(savedNote);
				return savedNote;
			});

			saveQueue.current = nextSave.then(
				() => undefined,
				() => undefined,
			);
			return nextSave;
		},
		[],
	);

	/** Resolves with the note's id once every queued save has settled. */
	const whenIdle = useCallback(async () => {
		await saveQueue.current;
		return noteId.current;
	}, []);

	return { save, storedNote, whenIdle };
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
	const [state, setState] = useState<NoteSaveState>(
		noteStatus ? "saved" : "untouched",
	);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const lastSavedValues = useRef(initialValues);
	const latestValues = useRef(values);
	const requestId = useRef(0);
	const hasSaved = noteStatus !== null;

	latestValues.current = values;

	const save = useCallback(
		(valuesToSave: NoteFormValues) => {
			const currentRequestId = ++requestId.current;
			setState("saving");

			void onSave(valuesToSave)
				.then(() => {
					lastSavedValues.current = valuesToSave;
					if (currentRequestId !== requestId.current) return;
					setLastSavedAt(new Date());
					setState(
						areValuesEqual(latestValues.current, valuesToSave)
							? "saved"
							: "pending",
					);
				})
				.catch(() => {
					if (currentRequestId === requestId.current) setState("failed");
				});
		},
		[onSave],
	);

	/** Records a save made outside autosave, such as the Save note action. */
	const markSaved = useCallback((savedValues: NoteFormValues) => {
		requestId.current++;
		lastSavedValues.current = savedValues;
		setLastSavedAt(new Date());
		setState("saved");
	}, []);

	const canAutosave = isValidForAutosave(values, noteStatus);

	useEffect(() => {
		if (isManualSaveInProgress) return;
		if (areValuesEqual(values, lastSavedValues.current)) {
			setState((current) =>
				current === "pending" ? (hasSaved ? "saved" : "untouched") : current,
			);
			return;
		}

		setState((current) => (current === "failed" ? current : "pending"));
		if (!canAutosave) return;
		const timeoutId = window.setTimeout(() => save(values), AUTOSAVE_DELAY_MS);
		return () => window.clearTimeout(timeoutId);
	}, [canAutosave, hasSaved, isManualSaveInProgress, save, values]);

	return {
		canAutosave,
		lastSavedAt,
		markSaved,
		retry: () => save(latestValues.current),
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
	return `at ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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
