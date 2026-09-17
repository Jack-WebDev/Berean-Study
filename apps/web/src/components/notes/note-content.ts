import type {
	RichTextDocument,
	RichTextNode,
} from "@berean-study/rich-text-editor/types";

export const emptyNoteDocument: RichTextDocument = {
	content: [{ type: "paragraph" }],
	type: "doc",
};

/**
 * Notes keep their structured document as JSON in the established text column.
 * Plain-text records created before the rich text editor remain editable.
 */
export function parseNoteContent(content: string): RichTextDocument {
	try {
		const parsed: unknown = JSON.parse(content);
		if (isRichTextDocument(parsed)) return parsed;
	} catch {
		// Legacy note content is plain text.
	}

	if (!content.trim()) return emptyNoteDocument;
	return {
		content: [
			{
				content: [{ text: content, type: "text" }],
				type: "paragraph",
			},
		],
		type: "doc",
	};
}

export function serializeNoteContent(document: RichTextDocument) {
	return JSON.stringify(document);
}

export function getNoteContentText(content: string) {
	return getDocumentText(parseNoteContent(content));
}

export function hasNoteContent(document: RichTextDocument) {
	return getDocumentText(document).trim().length > 0;
}

function getDocumentText(document: RichTextDocument) {
	return extractNodeText(document).trim();
}

function extractNodeText(node: RichTextNode): string {
	const text = typeof node.text === "string" ? node.text : "";
	const children = Array.isArray(node.content)
		? node.content.map(extractNodeText).join("")
		: "";
	const separator = isTextBlock(node.type) ? "\n" : "";
	return `${text}${children}${separator}`;
}

function isTextBlock(type: string | undefined) {
	return [
		"paragraph",
		"heading",
		"blockquote",
		"listItem",
		"tableCell",
		"tableHeader",
	].includes(type ?? "");
}

function isRichTextDocument(value: unknown): value is RichTextDocument {
	if (!value || typeof value !== "object") return false;
	const document = value as { content?: unknown; type?: unknown };
	return document.type === "doc" && Array.isArray(document.content);
}
