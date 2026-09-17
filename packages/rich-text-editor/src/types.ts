/**
 * The persisted document contract. Its shape intentionally matches the JSON
 * representation produced by the editor foundation selected in Phase 2.
 */
export type RichTextDocument = {
	type: "doc";
	content?: RichTextNode[];
};

/** A serializable node or text mark in a rich-text document. */
export type RichTextNode = {
	attrs?: Record<string, unknown>;
	content?: RichTextNode[];
	marks?: RichTextNode[];
	text?: string;
	type: string;
};

export type BibleReferenceAttributes = {
	label: string;
	passageId: number;
};

export type CitationAttributes = {
	citationId: number;
	label: string;
};

/** The supported capability sets; resource-specific editor variants are avoided. */
export type RichTextPreset = "member" | "editorial";

/** A selection supplied by the host application's picker UI. */
export type RichTextSelectionResult =
	| { type: "bibleReference"; value: BibleReferenceAttributes }
	| { type: "citation"; value: CitationAttributes };

/**
 * Integration contract for future editor UI. The editor receives values and
 * emits values; persistence and picker interfaces stay with the consumer.
 */
export type RichTextEditorConfig = {
	editable?: boolean;
	onChange: (document: RichTextDocument) => void;
	onRequestBibleReference?: () => Promise<BibleReferenceAttributes | null>;
	onRequestCitation?: () => Promise<CitationAttributes | null>;
	placeholder?: string;
	preset?: RichTextPreset;
	value: RichTextDocument;
};
