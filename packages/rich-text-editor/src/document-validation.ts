import type { RichTextDocument, RichTextNode } from "./document-types";

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
	if (!isRecord(value) || value.type !== "doc") return false;
	return Array.isArray(value.content) && value.content.every(isRichTextNode);
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

function isRichTextNode(value: unknown): value is RichTextNode {
	if (!isRecord(value) || typeof value.type !== "string") return false;
	if (value.text !== undefined && typeof value.text !== "string") return false;
	if (value.attrs !== undefined && !isRecord(value.attrs)) return false;
	if (
		value.marks !== undefined &&
		(!Array.isArray(value.marks) ||
			!value.marks.every(
				(mark) => isRecord(mark) && typeof mark.type === "string",
			))
	)
		return false;
	return (
		value.content === undefined ||
		(Array.isArray(value.content) && value.content.every(isRichTextNode))
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
