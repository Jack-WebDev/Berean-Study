import type { ReactNode } from "react";
import type { DockedToolbarItem } from "./docked-toolbar";
import type { RichTextDocument, VerseBlockAttributes } from "./document-types";
import type { EditorSession } from "./editor-session";
import type { SlashCommandItem } from "./slash-commands";

export type {
	RichTextDocument,
	RichTextNode,
	SectionVariant,
	VerseBlockAttributes,
} from "./document-types";

export type BibleReferenceAttributes = {
	label: string;
	passageId: number;
};

/** Lets "@" link a passage: the host finds passages and records the link. */
export type PassageMentionSource = {
	onLink: (passage: BibleReferenceAttributes) => void;
	search: (query: string) => readonly BibleReferenceAttributes[];
};

export type CitationAttributes = {
	citationId: number;
	label: string;
};

export type VerseText = { number: number; text: string };

export type RichTextEditorPreset = "member" | "contributor";

/**
 * - `full`: every formatting control (the default).
 * - `simple`: text style, bold, italic, underline, highlight, lists, quote,
 *   link, verse, undo and redo. No tables, alignment or code.
 * - `compact`: a short row for small inline composers; pair it with
 *   `onExpand` to offer the full-screen editor.
 * - `docked`: labelled buttons below the writing, pinned to the bottom of
 *   the screen; choose them with `toolbarItems`.
 */
export type EditorToolbarVariant = "full" | "simple" | "compact" | "docked";

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
	/** Turns on "@" passage links; without it "@" is plain text. */
	passageMentions?: PassageMentionSource;
	className?: string;
	contentClassName?: string;
	editable?: boolean;
	footer?: ReactNode;
	id?: string;
	onChange: (document: RichTextDocument) => void;
	/** Opens a host-owned passage picker; the editor only inserts its result. */
	onRequestBibleReference?: () =>
		| BibleReferenceAttributes
		| null
		| undefined
		| Promise<BibleReferenceAttributes | null | undefined>;
	/** Asks the host for a name and inserts it; enables the "Person" command. */
	onRequestPerson?: () =>
		| string
		| null
		| undefined
		| Promise<string | null | undefined>;
	/** Shows an "Open full-screen editor" button in the toolbar. */
	onExpand?: () => void;
	/** Limits and orders the `/` menu; every available command when omitted. */
	slashCommands?: readonly SlashCommandItem[];
	/** Which formatting controls to show; see `EditorToolbarVariant`. */
	toolbar?: EditorToolbarVariant;
	/** The docked toolbar's buttons, in order. Only used with `toolbar="docked"`. */
	toolbarItems?: readonly DockedToolbarItem[];
	/** Opens a host-owned verse picker and inserts the chosen range as a Verse block. */
	onRequestVerse?: () =>
		| VerseBlockAttributes
		| null
		| undefined
		| Promise<VerseBlockAttributes | null | undefined>;
	/** Reports the index of the outline section containing the cursor. */
	onActiveSectionChange?: (index: number | null) => void;
	/** Shown under the writing surface while the document is empty. */
	emptyState?: ReactNode;
	/** Opens a host-owned source picker; contributor preset only. */
	onRequestCitation?: () =>
		| CitationAttributes
		| null
		| undefined
		| Promise<CitationAttributes | null | undefined>;
	/** Receives semantic editing operations for optional composition layers. */
	onSessionReady?: (session: EditorSession | null) => void;
	placeholder?: string;
	preset?: RichTextEditorPreset;
	value: RichTextDocument;
};

export type RichTextRendererProps = {
	ariaLabel?: string;
	contentClassName?: string;
	/** A malformed value is rendered as an empty document. */
	document: RichTextDocument | null | undefined;
	preset?: RichTextEditorPreset;
	/** `card` frames the content; `plain` leaves it on the page's own surface. */
	variant?: "card" | "plain";
};

export type RichTextEditorWorkspaceSlots = {
	/** Optional host controls rendered above the writing surface. */
	editorHeader?: ReactNode;
	/** Content owned by the workspace inspector, grouped by its semantic region. */
	inspector?: {
		/** Host-rendered tag controls; the editor has no tag persistence knowledge. */
		tags?: ReactNode;
		/** Host-rendered organization context, such as a location or collection. */
		organization?: ReactNode;
		/** Host-rendered resource details, such as status and timestamps. */
		details?: ReactNode;
		/** Supporting content displayed below the inline inspector rail. */
		footer?: ReactNode;
	};
	/** Content displayed in the focused workspace header. */
	focusedHeader?: {
		/** Host-owned save status. */
		status?: ReactNode;
		/** Host-provided document context. */
		title?: ReactNode;
	};
};

export type RichTextEditorWorkspaceProps = RichTextEditorProps & {
	/** Host-owned regions rendered by the workspace. */
	slots?: RichTextEditorWorkspaceSlots;
	/** Visual arrangement for a dedicated writing composer. */
	presentation?: "composer" | "default";
};
