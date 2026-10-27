import type { JSONContent } from "@tiptap/core";

/** The structured document contract persisted by authored-content repositories. */
export type RichTextDocument = JSONContent & { type: "doc" };

/** A serializable node or text mark within a rich-text document. */
export type RichTextNode = JSONContent;

/**
 * A quoted Scripture range. The host renders the verse text from its Bible
 * source so the quote follows translation changes. `text` is an optional copy
 * of the words taken when the verse was inserted; it is shown only when the
 * host can't load the verse (for example, a read-only preview).
 */
export type VerseBlockAttributes = {
	book: string;
	bookId: number;
	chapter: number;
	passageId: number;
	text?: string | null;
	translation: string;
	verseEnd: number;
	verseStart: number;
};

/** Tones for template section headings; `section` is the neutral default. */
export type SectionVariant = "apply" | "interpret" | "observe" | "section";
