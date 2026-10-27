import {
	emptyRichTextDocument,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";

/**
 * Unsaved new entries. The inline composer and the full-screen editor share
 * one draft, so "expand" carries over everything typed so far.
 */
export type PrayerDraft = {
	category: string;
	content: RichTextDocument;
	prayingFor: string;
	title: string;
};

export type TestimonyDraft = {
	content: RichTextDocument;
	/** "YYYY-MM" from the month input, or empty. */
	happenedMonth: string;
	share: boolean;
	title: string;
};

export const emptyPrayerDraft: PrayerDraft = {
	category: "Request",
	content: emptyRichTextDocument,
	prayingFor: "",
	title: "",
};

/**
 * The faded hint in an empty testimony. It's never saved: a testimony starts
 * as a blank page rather than with question headings.
 */
export const testimonyPrompt =
	"What happened, and where did you see God’s faithfulness?";

export function createEmptyTestimonyDraft(): TestimonyDraft {
	return {
		content: emptyRichTextDocument,
		happenedMonth: "",
		share: false,
		title: "",
	};
}
