/** Wait this long after scrolling stops before saving, so a quick flick isn't saved. */
export const placeSaveDelayMs = 1500;

/**
 * Decides when to save the reading place. It knows nothing about the page: it
 * asks `measure` which verse is at the top, and hands the verse to `save`.
 *
 * - A timed save waits until scrolling has stopped for `delayMs`, then measures.
 * - Leaving saves straight away, using the verse last measured, because by then
 *   the chapter's verses may already be off the page.
 * - The same verse is never saved twice in a row.
 */
export function createPlaceSaver({
	delayMs = placeSaveDelayMs,
	measure,
	save,
}: {
	delayMs?: number;
	/** The verse at the top of the reading area, or null if it can't be measured. */
	measure: () => number | null;
	save: (verse: number) => void;
}) {
	let verseInView: number | null = null;
	let lastSaved: number | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const noteVerse = () => {
		verseInView = measure() ?? verseInView;
	};

	const saveNow = () => {
		clearTimeout(timer);
		timer = undefined;
		if (verseInView === null || verseInView === lastSaved) return;
		lastSaved = verseInView;
		save(verseInView);
	};

	return {
		/** Records the verse at the top now, for a save that may come after it's gone. */
		noteVerse,
		/** Saves the last measured verse now, such as when leaving. */
		saveNow,
		/** Saves once things have been still for `delayMs`. Each call starts the wait again. */
		saveSoon: () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				noteVerse();
				saveNow();
			}, delayMs);
		},
	};
}
