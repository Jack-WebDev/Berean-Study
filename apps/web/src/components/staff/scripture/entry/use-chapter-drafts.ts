import type { VerseTextStatus } from "@berean-study/db/scripture-catalogue";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveVerseDrafts } from "@/functions/verse-entry";
import { invalidateVerseText } from "@/queries/verse-text";

const AUTOSAVE_DELAY_MS = 1200;

export type DraftSaveState = "failed" | "idle" | "pending" | "saved" | "saving";

type ChapterAddress = { abbreviation: string; chapter: number; slug: string };

type DraftRow = { number: number; status: VerseTextStatus; text: string };

export type PastedVerse = { number: number; text: string };

/**
 * Holds a chapter's unsaved wording and autosaves it shortly after typing stops.
 *
 * Saves run one at a time, each followed by a refresh, so a later save never
 * starts from out-of-date wording. Each verse remembers the wording this person
 * last saw or saved, and sends it along. If someone else has changed the verse
 * since, the server refuses rather than overwriting them.
 */
export function useChapterDrafts(address: ChapterAddress, rows: DraftRow[]) {
	const queryClient = useQueryClient();
	const [edits, setEdits] = useState<Record<number, string>>({});
	const [state, setState] = useState<DraftSaveState>("idle");
	const [savedAt, setSavedAt] = useState<Date | null>(null);
	const [error, setError] = useState<string | null>(null);

	const latestEdits = useRef(edits);
	latestEdits.current = edits;
	const latestAddress = useRef(address);
	latestAddress.current = address;

	const base = useRef(new Map<number, string>());
	// A verse being typed in keeps its own starting point. Refreshing it here
	// would hide a change someone else made, and overwrite it on the next save.
	for (const row of rows) {
		if (!(row.number in edits)) base.current.set(row.number, row.text);
	}

	const accepted = useRef(new Set<number>());
	const queue = useRef<Promise<boolean>>(Promise.resolve(true));

	const collectUnsaved = useCallback(() => {
		const unsaved = new Map<number, { baseText: string; text: string }>();
		for (const [key, text] of Object.entries(latestEdits.current)) {
			const number = Number(key);
			const baseText = base.current.get(number) ?? "";
			if (text.trim() !== baseText) unsaved.set(number, { baseText, text });
		}
		for (const number of accepted.current) {
			if (unsaved.has(number)) continue;
			const baseText = base.current.get(number) ?? "";
			unsaved.set(number, { baseText, text: baseText });
		}
		return unsaved;
	}, []);

	const save = useCallback(
		(pasted: readonly PastedVerse[] = []) => {
			const run = queue.current.then(async () => {
				const unsaved = collectUnsaved();
				for (const verse of pasted) {
					unsaved.set(verse.number, {
						baseText: base.current.get(verse.number) ?? "",
						text: verse.text,
					});
				}
				if (unsaved.size === 0) return true;

				setState("saving");
				try {
					await saveVerseDrafts({
						data: {
							...latestAddress.current,
							addMissingVerses: pasted.length > 0 ? true : undefined,
							verses: [...unsaved].map(([number, verse]) => ({
								...verse,
								number,
							})),
						},
					});
					for (const [number, { text }] of unsaved) {
						base.current.set(number, text.trim());
						accepted.current.delete(number);
					}
					if (pasted.length > 0) {
						setEdits((current) => {
							const next = { ...current };
							for (const { number } of pasted) delete next[number];
							latestEdits.current = next;
							return next;
						});
					}
					setError(null);
					setSavedAt(new Date());
					await invalidateVerseText(queryClient);
					setState(collectUnsaved().size > 0 ? "pending" : "saved");
					return true;
				} catch (cause) {
					setError(
						cause instanceof Error
							? cause.message
							: "Your changes couldn't be saved.",
					);
					setState("failed");
					return false;
				}
			});
			queue.current = run;
			return run;
		},
		[collectUnsaved, queryClient],
	);

	const flush = useCallback(() => save(), [save]);

	useEffect(() => {
		if (Object.keys(edits).length === 0 || collectUnsaved().size === 0) return;
		setState((current) => (current === "failed" ? current : "pending"));
		const timeout = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
		return () => window.clearTimeout(timeout);
	}, [collectUnsaved, edits, save]);

	// Moving to another chapter saves on the way out.
	useEffect(() => () => void save(), [save]);

	const hasUnsavedWork = state === "pending" || state === "saving";
	useEffect(() => {
		if (!hasUnsavedWork) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [hasUnsavedWork]);

	const setVerseText = useCallback((number: number, text: string) => {
		setEdits((current) => ({ ...current, [number]: text }));
	}, []);

	/** Keeps a sent-back verse's wording as it is, ready to send again. */
	const keepWording = useCallback(
		(number: number) => {
			accepted.current.add(number);
			void save();
		},
		[save],
	);

	/** Drops unsaved typing, for after it has been sent on or refused. */
	const discard = useCallback(() => {
		latestEdits.current = {};
		accepted.current.clear();
		setEdits({});
		setError(null);
		setState("idle");
	}, []);

	const reload = useCallback(async () => {
		base.current.clear();
		discard();
		await invalidateVerseText(queryClient);
	}, [discard, queryClient]);

	return {
		discard,
		edits,
		error,
		flush,
		keepWording,
		reload,
		savePasted: save,
		savedAt,
		setVerseText,
		state,
	};
}
