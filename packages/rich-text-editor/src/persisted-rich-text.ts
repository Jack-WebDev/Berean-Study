import { getDocumentText } from "./document-utils";
import {
	emptyRichTextDocument,
	normalizeRichTextDocument,
} from "./document-validation";
import type { RichTextDocument } from "./types";

/**
 * Reads a structured rich-text document from a text-backed storage column.
 * Invalid stored values are treated as an empty document.
 */
export function parsePersistedRichText(content: string): RichTextDocument {
	try {
		const parsed: unknown = JSON.parse(content);
		return normalizeRichTextDocument(parsed);
	} catch {
		return emptyRichTextDocument;
	}
}

/** Serializes a validated editor document for a text-backed storage column. */
export function serializePersistedRichText(value: unknown): string {
	return JSON.stringify(normalizeRichTextDocument(value));
}

/** Returns the visible plaintext represented by a stored rich-text value. */
export function getPersistedRichTextText(content: string): string {
	return getDocumentText(parsePersistedRichText(content));
}

/**
 * Returns an excerpt of visible content. The supplied maximum limits the text
 * before the ellipsis, preserving the established display behavior.
 */
export function getPersistedRichTextExcerpt(
	content: string,
	maxLength = 160,
): string {
	const text = getPersistedRichTextText(content);
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength).trimEnd()}…`;
}
