import type { RichTextDocument } from "@berean-study/rich-text-editor/document";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { invalidatePrayerJournal } from "@/queries/prayer-journal";

import { useJournalAutosave } from "./use-journal-autosave";

/**
 * Holds an entry's fields and autosaves them. A new entry is created by its
 * first save and updated after that. Until then its fields are kept in the
 * shared draft, so leaving and coming back doesn't lose them.
 */
export function useEntryEditor<Values extends { content: RichTextDocument }>({
	canSave,
	create,
	existingId,
	initial,
	onDraftChange,
	update,
}: {
	canSave: (values: Values) => boolean;
	create: (values: Values) => Promise<number>;
	existingId?: number;
	initial: Values;
	/** Receives unsaved new-entry fields, and null once the entry is created. */
	onDraftChange?: (values: Values | null) => void;
	update: (id: number, values: Values) => Promise<unknown>;
}) {
	const queryClient = useQueryClient();
	const [values, setValues] = useState(initial);
	const [savedId, setSavedId] = useState(existingId ?? null);
	const savedIdRef = useRef(savedId);
	const onDraftChangeRef = useRef(onDraftChange);
	onDraftChangeRef.current = onDraftChange;

	useEffect(() => {
		if (savedId === null) onDraftChangeRef.current?.(values);
	}, [savedId, values]);

	const autosave = useJournalAutosave({
		canSave: canSave(values),
		initialValues: initial,
		onSave: async (next: Values) => {
			const id = savedIdRef.current;
			if (id === null) {
				const createdId = await create(next);
				savedIdRef.current = createdId;
				setSavedId(createdId);
				onDraftChangeRef.current?.(null);
			} else {
				await update(id, next);
			}
			await invalidatePrayerJournal(queryClient);
		},
		values,
	});

	// "Done" and "← Prayer Journal" wait for the last save. Closing or
	// reloading the tab can't, so ask the browser to warn first.
	const hasUnsavedWork =
		(autosave.isDirty && canSave(values)) || autosave.state === "saving";
	useEffect(() => {
		if (!hasUnsavedWork) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [hasUnsavedWork]);

	return {
		autosave,
		canSave: canSave(values),
		isNew: existingId === undefined,
		savedId,
		setValues,
		values,
	};
}
