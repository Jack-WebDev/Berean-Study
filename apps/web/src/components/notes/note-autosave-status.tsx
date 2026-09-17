import type { RichTextDocument } from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import { Spinner } from "@berean-study/ui/components/spinner";
import { CheckIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { hasNoteContent } from "./note-content";

export type NoteFormValues = {
	content: RichTextDocument;
	passageId: string;
	tags: string[];
	title: string;
};

type AutosaveStatus = "idle" | "saving" | "saved" | "failed";

const AUTOSAVE_DELAY_MS = 5000;

export function NoteAutosaveStatus({
	initialValues,
	isManualSaveInProgress,
	onSave,
	onStatusChange,
	values,
}: {
	initialValues: NoteFormValues;
	isManualSaveInProgress: boolean;
	onSave: (values: NoteFormValues) => Promise<void>;
	onStatusChange?: (status: AutosaveStatus) => void;
	values: NoteFormValues;
}) {
	const [status, setStatus] = useState<AutosaveStatus>("saved");
	const lastSavedValues = useRef(initialValues);
	const latestValues = useRef(values);
	const requestId = useRef(0);

	latestValues.current = values;

	useEffect(() => onStatusChange?.(status), [onStatusChange, status]);

	const save = useCallback(
		(valuesToSave: NoteFormValues) => {
			const currentRequestId = ++requestId.current;
			setStatus("saving");

			void onSave(valuesToSave)
				.then(() => {
					lastSavedValues.current = valuesToSave;
					if (
						currentRequestId === requestId.current &&
						areValuesEqual(latestValues.current, valuesToSave)
					) {
						setStatus("saved");
					}
				})
				.catch(() => {
					if (currentRequestId === requestId.current) setStatus("failed");
				});
		},
		[onSave],
	);

	useEffect(() => {
		if (
			isManualSaveInProgress ||
			areValuesEqual(values, lastSavedValues.current)
		) {
			if (areValuesEqual(values, lastSavedValues.current)) setStatus("saved");
			return;
		}

		if (!isValidForAutosave(values)) {
			setStatus("idle");
			return;
		}

		setStatus("idle");
		const timeoutId = window.setTimeout(() => save(values), AUTOSAVE_DELAY_MS);
		return () => window.clearTimeout(timeoutId);
	}, [isManualSaveInProgress, save, values]);

	return (
		<div
			aria-live="polite"
			className="flex flex-wrap items-center gap-2"
			role="status"
		>
			{status === "saving" ? (
				<>
					<Spinner aria-hidden="true" />
					<span className="text-muted-foreground text-sm">Saving changes…</span>
				</>
			) : status === "failed" ? (
				<>
					<span className="text-destructive text-sm">
						Autosave failed. Your changes are still in the editor.
					</span>
					<Button
						onClick={() => save(latestValues.current)}
						size="sm"
						type="button"
						variant="outline"
					>
						Retry
					</Button>
				</>
			) : status === "saved" ? (
				<>
					<CheckIcon aria-hidden="true" className="size-4" />
					<span className="text-muted-foreground text-sm">
						All changes saved
					</span>
				</>
			) : (
				<span className="text-muted-foreground text-sm">
					Changes save automatically after you pause typing.
				</span>
			)}
		</div>
	);
}

function areValuesEqual(left: NoteFormValues, right: NoteFormValues) {
	return (
		JSON.stringify(left.content) === JSON.stringify(right.content) &&
		left.passageId === right.passageId &&
		left.title === right.title &&
		left.tags.length === right.tags.length &&
		left.tags.every((tag, index) => tag === right.tags[index])
	);
}

function isValidForAutosave(values: NoteFormValues) {
	return Boolean(values.title.trim()) && hasNoteContent(values.content);
}
