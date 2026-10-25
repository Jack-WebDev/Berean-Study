import type { JSONContent } from "@tiptap/core";

/** The structured document contract persisted by authored-content repositories. */
export type RichTextDocument = JSONContent & { type: "doc" };

/** A serializable node or text mark within a rich-text document. */
export type RichTextNode = JSONContent;

/**
 * A quoted Scripture range. Only the reference is stored; the host renders the
 * verse text from its Bible source so the quote follows translation changes.
 */
export type VerseBlockAttributes = {
	book: string;
	bookId: number;
	chapter: number;
	passageId: number;
	translation: string;
	verseEnd: number;
	verseStart: number;
};

/** Tones for template section headings; `section` is the neutral default. */
export type SectionVariant = "apply" | "interpret" | "observe" | "section";
