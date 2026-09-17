import type { Editor } from "@tiptap/core";

import type {
	BibleReferenceAttributes,
	CitationAttributes,
	RichTextEditorPreset,
} from "./types";

export type EditorActionId =
	| "paragraph"
	| "heading2"
	| "heading3"
	| "bullet"
	| "numbered"
	| "quote"
	| "divider"
	| "table"
	| "bible"
	| "citation";

export type ReferenceRequest = () =>
	| BibleReferenceAttributes
	| null
	| undefined
	| Promise<BibleReferenceAttributes | null | undefined>;
export type CitationRequest = () =>
	| CitationAttributes
	| null
	| undefined
	| Promise<CitationAttributes | null | undefined>;

export type EditorActionContext = {
	onRequestBibleReference?: ReferenceRequest;
	onRequestCitation?: CitationRequest;
	preset: RichTextEditorPreset;
};

export type EditorAction = {
	id: EditorActionId;
	keywords: string[];
	label: string;
};

const baseActions: EditorAction[] = [
	{ id: "paragraph", keywords: ["text"], label: "Paragraph" },
	{ id: "heading2", keywords: ["heading", "h2"], label: "Heading 2" },
	{ id: "heading3", keywords: ["heading", "h3"], label: "Heading 3" },
	{ id: "bullet", keywords: ["list", "unordered"], label: "Bulleted list" },
	{ id: "numbered", keywords: ["list", "ordered"], label: "Numbered list" },
	{ id: "quote", keywords: ["blockquote"], label: "Quote" },
	{ id: "divider", keywords: ["horizontal", "rule"], label: "Divider" },
	{ id: "table", keywords: ["grid"], label: "Table" },
];

export function getAvailableEditorActions(
	context: EditorActionContext,
): EditorAction[] {
	const actions = [...baseActions];
	if (context.onRequestBibleReference) {
		actions.push({
			id: "bible",
			keywords: ["reference", "passage"],
			label: "Bible reference",
		});
	}
	if (context.preset === "contributor" && context.onRequestCitation) {
		actions.push({
			id: "citation",
			keywords: ["source", "footnote"],
			label: "Citation",
		});
	}
	return actions;
}

export function filterEditorActions(actions: EditorAction[], query: string) {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return actions;
	return actions.filter((action) =>
		[action.id, action.label, ...action.keywords].some((value) =>
			value.toLowerCase().includes(normalizedQuery),
		),
	);
}

/** The single execution path shared by toolbar, slash, and future insert UI. */
export async function executeEditorAction(
	editor: Editor,
	actionId: EditorActionId,
	context: EditorActionContext,
) {
	switch (actionId) {
		case "paragraph":
			return editor.chain().focus().setParagraph().run();
		case "heading2":
			return editor.chain().focus().toggleHeading({ level: 2 }).run();
		case "heading3":
			return editor.chain().focus().toggleHeading({ level: 3 }).run();
		case "bullet":
			return editor.chain().focus().toggleBulletList().run();
		case "numbered":
			return editor.chain().focus().toggleOrderedList().run();
		case "quote":
			return editor.chain().focus().toggleBlockquote().run();
		case "divider":
			return editor.chain().focus().setHorizontalRule().run();
		case "table":
			return editor
				.chain()
				.focus()
				.insertTable({ cols: 3, rows: 3, withHeaderRow: true })
				.run();
		case "bible": {
			const reference = await context.onRequestBibleReference?.();
			return reference
				? editor.commands.insertBibleReference(reference)
				: false;
		}
		case "citation": {
			const citation = await context.onRequestCitation?.();
			return citation ? editor.commands.insertCitation(citation) : false;
		}
	}
}
