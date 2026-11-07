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

/** How firmly a cited excerpt backs what's said. */
export type CitationStrength = "background" | "direct" | "partial";

/**
 * A footnote to a saved source excerpt. It's numbered by where it falls in the
 * document, so `label` only names the source, for tooltips and lists.
 */
export type CitationAttributes = {
	excerptId: number;
	label: string;
	locator: string;
	strength: CitationStrength;
};

/**
 * A Scripture reference typed by a contributor. It points to a book and verses
 * rather than a stored passage, because verses are entered over time and may
 * not exist yet when commentary is written.
 */
export type ScriptureReferenceAttributes = {
	bookSlug: string;
	label: string;
	variant: "cross" | "reference";
};

/** A Greek or Hebrew word quoted in contributor writing. */
export type OriginalTermAttributes = {
	gloss: string;
	language: "greek" | "hebrew";
	/** The original-language note this word opens, when one has been chosen. */
	noteScopeKey?: string | null;
	word: string;
};

export type ContentBlockKind =
	| "cross_reference"
	| "interpretive_question"
	| "textual_note";

/** A separately reviewed piece of content placed inside contributor writing. */
export type ContentBlockAttributes = {
	kind: ContentBlockKind;
	label: string;
	scopeKey: string;
};
