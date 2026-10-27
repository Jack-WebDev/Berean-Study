import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveState = "failed" | "idle" | "pending" | "saved" | "saving";

const AUTOSAVE_DELAY_MS = 1200;

/**
 * Saves `values` shortly after the member stops typing.
 *
 * Saves run one at a time, in order. That matters for a new entry: the first
 * save creates it, and a second save must wait for the new id rather than
 * create a duplicate.
 */
export function useJournalAutosave<Values>({
	canSave,
	initialValues,
	onSave,
	values,
}: {
	/** False while the entry is incomplete, such as before it has a title. */
	canSave: boolean;
	initialValues: Values;
	onSave: (values: Values) => Promise<unknown>;
	values: Values;
}) {
	const [state, setState] = useState<AutosaveState>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const lastSaved = useRef(serialize(initialValues));
	const latest = useRef(values);
	const queue = useRef<Promise<unknown>>(Promise.resolve());
	const onSaveRef = useRef(onSave);
	latest.current = values;
	onSaveRef.current = onSave;

	const save = useCallback(() => {
		const snapshot = latest.current;
		const key = serialize(snapshot);
		const run = queue.current.then(async () => {
			if (key === lastSaved.current) return;
			setState("saving");
			try {
				await onSaveRef.current(snapshot);
				lastSaved.current = key;
				setLastSavedAt(new Date());
				setState(serialize(latest.current) === key ? "saved" : "pending");
			} catch {
				setState("failed");
			}
		});
		queue.current = run;
		return run;
	}, []);

	const isDirty = serialize(values) !== lastSaved.current;

	useEffect(() => {
		if (!isDirty) return;
		setState((current) => (current === "failed" ? current : "pending"));
		if (!canSave) return;
		const timeoutId = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
		return () => window.clearTimeout(timeoutId);
	}, [canSave, isDirty, save]);

	return {
		/** Saves any unsaved change now, for "Done" and leaving the page. */
		flush: () => (canSave && isDirty ? save() : queue.current),
		isDirty,
		lastSavedAt,
		retry: () => void save(),
		state,
	};
}

function serialize(values: unknown) {
	return JSON.stringify(values);
}
