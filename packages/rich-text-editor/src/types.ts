import type { Editor, JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";

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

export type RichTextEditorPreset = "member" | "contributor";

export type DocumentReferences = {
	bibleReferences: BibleReferenceAttributes[];
	citations: CitationAttributes[];
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
	ariaLabel?: string;
	editable?: boolean;
	id?: string;
	onChange: (document: RichTextDocument) => void;
	/** Opens a host-owned passage picker; the editor only inserts its result. */
	onRequestBibleReference?: () =>
		| BibleReferenceAttributes
		| null
		| undefined
		| Promise<BibleReferenceAttributes | null | undefined>;
	/** Opens a host-owned source picker; contributor preset only. */
	onRequestCitation?: () =>
		| CitationAttributes
		| null
		| undefined
		| Promise<CitationAttributes | null | undefined>;
	/** Receives the editor instance for optional composition layers. */
	onEditorReady?: (editor: Editor | null) => void;
	placeholder?: string;
	preset?: RichTextEditorPreset;
	value: RichTextDocument;
};

export type RichTextRendererProps = {
	ariaLabel?: string;
	/** A malformed value is rendered as an empty document. */
	document: RichTextDocument | null | undefined;
	preset?: RichTextEditorPreset;
};

export type RichTextEditorWorkspaceProps = RichTextEditorProps & {
	/** Host-provided context displayed only in the focused workspace header. */
	focusedModeTitle?: ReactNode;
	/** Host-owned save status displayed only in the focused workspace header. */
	focusedModeStatus?: ReactNode;
	/** Host-rendered tag controls; the editor has no tag persistence knowledge. */
	tags?: ReactNode;
	/** Host-rendered organization context, such as a location or collection. */
	organization?: ReactNode;
	/** Host-rendered resource details, such as status and timestamps. */
	details?: ReactNode;
};
