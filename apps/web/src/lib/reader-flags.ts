/*
 * Bible reader features that are built but still waiting for the owner's approval
 * (HANDOFF.md §11). Each stays off, and hidden from readers, until it's approved.
 * Turning one on is a one-word change here.
 */
export const readerFlags = {
	/** Direction B: a "Show controls" button instead of always-visible controls. */
	focusMode: false,
	/** Short Berean Study headings above verses, and the switch to show them. */
	sectionHeadings: false,
	/** "Hide the menu while reading" on computers. */
	hideSidebarWhileReading: false,
	/** Interpretive Questions and Difficult Questions shown as one "Different views" tool. */
	mergedDifferentViews: false,
	/** Remove "Way of reading", "Remember position" and "Scrolling" from Account › Reading. */
	removeOldReadingSettings: false,
} as const satisfies Record<string, boolean>;

export type ReaderFlag = keyof typeof readerFlags;
