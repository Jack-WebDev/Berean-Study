import type { RichTextDocument } from "./types";

export const emptyRichTextDocument: RichTextDocument = {
	content: [{ type: "paragraph" }],
	type: "doc",
};

/**
 * Keeps malformed or unavailable persisted values from reaching the editor
 * foundation. Deeper node validation remains owned by the shared schema.
 */
export function normalizeRichTextDocument(value: unknown): RichTextDocument {
	if (!value || typeof value !== "object") return emptyRichTextDocument;
	const document = value as { content?: unknown; type?: unknown };
	return document.type === "doc" && Array.isArray(document.content)
		? (document as RichTextDocument)
		: emptyRichTextDocument;
}
