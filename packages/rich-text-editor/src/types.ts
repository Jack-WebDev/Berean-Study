import type { JSONContent } from "@tiptap/core";

/**
 * The persisted document contract. Its shape intentionally matches the JSON
 * representation produced by the editor foundation selected in Phase 2.
 */
export type RichTextDocument = JSONContent & { type: "doc" };

/** A serializable node or text mark in a rich-text document. */
export type RichTextNode = JSONContent;

export type BibleReferenceAttributes = {
	label: string;
	passageId: number;
};

export type CitationAttributes = {
	citationId: number;
	label: string;
};

/** A selection supplied by the host application's picker UI. */
export type RichTextSelectionResult =
	| { type: "bibleReference"; value: BibleReferenceAttributes }
	| { type: "citation"; value: CitationAttributes };

/**
 * Integration contract for future editor UI. The editor receives values and
 * emits values; persistence and picker interfaces stay with the consumer.
 */
export type RichTextEditorProps = {
	editable?: boolean;
	onChange: (document: RichTextDocument) => void;
	/** Opens a host-owned passage picker; the editor only inserts its result. */
	onRequestBibleReference?: () =>
		| BibleReferenceAttributes
		| null
		| undefined
		| Promise<BibleReferenceAttributes | null | undefined>;
	placeholder?: string;
	value: RichTextDocument;
};
