import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Saves that run one at a time, in the order they were asked for.
 *
 * TanStack runs mutations that share a scope one after another, so a later save
 * can't overtake an earlier one. That's what lets a new record's first save
 * create it and later saves update it: by the time a later save starts, the
 * first has finished and the new id is known. So `save` should read things like
 * that id from a ref when it runs, not from a value it closed over earlier.
 */
export function useOrderedSave<TInput, TResult>(
	save: (input: TInput) => Promise<TResult>,
) {
	const scopeId = useId();
	const saveRef = useRef(save);
	saveRef.current = save;
	const { mutateAsync } = useMutation({
		mutationFn: (input: TInput) => saveRef.current(input),
		scope: { id: scopeId },
	});

	const latest = useRef<Promise<unknown>>(Promise.resolve());
	const run = useCallback(
		(input: TInput) => {
			const saving = mutateAsync(input);
			latest.current = saving.catch(() => undefined);
			return saving;
		},
		[mutateAsync],
	);

	/** Resolves once every save asked for so far has finished, whether or not it worked. */
	const whenIdle = useCallback(async () => {
		await latest.current;
	}, []);

	return { save: run, whenIdle };
}

export type AutosaveState = "failed" | "idle" | "pending" | "saved" | "saving";

type SaveRequest<Values> = { force: boolean; values: Values };
type SaveOutcome<Result> = { saved: false } | { result: Result; saved: true };

/**
 * Saves `values` a short while after typing stops.
 *
 * Saves go through `useOrderedSave`, so they run one at a time, in order. When a
 * save's turn comes and those values are already saved, it's skipped. A failed
 * save leaves the state "failed", even while typing goes on, until a save works.
 */
export function useAutosave<Values, Result = unknown>({
	canSave = true,
	delayMs,
	initialValues,
	isEqual = haveSameJson,
	paused = false,
	save,
	values,
}: {
	/** False while the values can't be saved yet, such as before a required title. */
	canSave?: boolean;
	delayMs: number;
	/** What's already saved when the editor opens. */
	initialValues: Values;
	isEqual?: (left: Values, right: Values) => boolean;
	/** Holds off new saves while something else is changing the record. */
	paused?: boolean;
	save: (values: Values) => Promise<Result>;
	values: Values;
}) {
	const [state, setState] = useState<AutosaveState>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const lastSaved = useRef(initialValues);
	const latestValues = useRef(values);
	latestValues.current = values;
	const isEqualRef = useRef(isEqual);
	isEqualRef.current = isEqual;
	// Bumped when a save made elsewhere is recorded, so an older autosave that
	// finishes late can't mark the editor as changed or failed again.
	const generation = useRef(0);

	const ordered = useOrderedSave(
		async ({
			force,
			values: toSave,
		}: SaveRequest<Values>): Promise<SaveOutcome<Result>> => {
			if (!force && isEqualRef.current(toSave, lastSaved.current)) {
				return { saved: false };
			}
			const startedIn = generation.current;
			setState("saving");
			try {
				const result = await save(toSave);
				if (startedIn === generation.current) {
					lastSaved.current = toSave;
					setLastSavedAt(new Date());
					setError(null);
					setState(
						isEqualRef.current(latestValues.current, toSave)
							? "saved"
							: "pending",
					);
				}
				return { result, saved: true };
			} catch (cause) {
				if (startedIn === generation.current) {
					setError(
						cause instanceof Error ? cause : new Error("Couldn't save."),
					);
					setState("failed");
				}
				throw cause;
			}
		},
	);
	const { save: runSave, whenIdle } = ordered;

	const isDirty = !isEqual(values, lastSaved.current);
	const valuesKey = JSON.stringify(values);

	// biome-ignore lint/correctness/useExhaustiveDependencies: valuesKey restarts the wait on every change, so saving happens once typing stops.
	useEffect(() => {
		if (paused) return;
		if (!isDirty) {
			setState((current) =>
				current === "pending" ? (lastSavedAt ? "saved" : "idle") : current,
			);
			return;
		}
		setState((current) => (current === "failed" ? current : "pending"));
		if (!canSave) return;
		const timeoutId = window.setTimeout(() => {
			runSave({ force: false, values: latestValues.current }).catch(
				// The state already says it failed, and offers a retry.
				() => undefined,
			);
		}, delayMs);
		return () => window.clearTimeout(timeoutId);
	}, [canSave, delayMs, isDirty, lastSavedAt, paused, runSave, valuesKey]);

	/** Saves any unsaved change now, then waits for every save to finish. For "Done" and leaving. */
	const flush = useCallback(async () => {
		if (
			canSave &&
			!isEqualRef.current(latestValues.current, lastSaved.current)
		) {
			await runSave({ force: false, values: latestValues.current });
		}
		await whenIdle();
	}, [canSave, runSave, whenIdle]);

	/** Saves the current values even if nothing changed, and gives back what the save returned. */
	const saveNow = useCallback(async () => {
		const outcome = await runSave({
			force: true,
			values: latestValues.current,
		});
		if (!outcome.saved) throw new Error("A forced save always runs.");
		return outcome.result;
	}, [runSave]);

	const retry = useCallback(() => {
		runSave({ force: false, values: latestValues.current }).catch(
			() => undefined,
		);
	}, [runSave]);

	/** Records a save made outside autosave, such as a "Save" button. */
	const markSaved = useCallback((savedValues: Values) => {
		generation.current++;
		lastSaved.current = savedValues;
		setLastSavedAt(new Date());
		setError(null);
		setState("saved");
	}, []);

	return {
		error,
		flush,
		isDirty,
		lastSavedAt,
		markSaved,
		retry,
		saveNow,
		state,
		whenIdle,
	};
}

function haveSameJson(left: unknown, right: unknown) {
	return JSON.stringify(left) === JSON.stringify(right);
}
