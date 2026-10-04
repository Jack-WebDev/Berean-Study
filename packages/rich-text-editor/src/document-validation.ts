import type { RichTextDocument, RichTextNode } from "./types";

export const emptyRichTextDocument: RichTextDocument = {
	content: [{ type: "paragraph" }],
	type: "doc",
};

/**
 * Keeps malformed or unavailable persisted values from reaching the editor
 * foundation. Deeper node validation remains owned by the shared schema.
 */
export function normalizeRichTextDocument(value: unknown): RichTextDocument {
	return isRichTextDocument(value) ? value : emptyRichTextDocument;
}

/** Checks the top-level document contract required by the editor foundation. */
export function isRichTextDocument(value: unknown): value is RichTextDocument {
	if (!value || typeof value !== "object") return false;
	const document = value as { content?: unknown; type?: unknown };
	return document.type === "doc" && Array.isArray(document.content);
}

/** Returns whether a document contains user-authored text or a structured inline reference. */
export function hasRichTextContent(document: RichTextDocument) {
	return hasMeaningfulNode(document);
}

function hasMeaningfulNode(node: RichTextNode): boolean {
	if (typeof node.text === "string" && node.text.trim()) return true;
	if (node.type === "bibleReference" || node.type === "citation") return true;
	return Array.isArray(node.content) && node.content.some(hasMeaningfulNode);
}
