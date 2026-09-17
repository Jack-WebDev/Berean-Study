import type { JSONContent } from "@tiptap/core";
import type { RichTextDocument } from "./types";

export type DocumentHeading = { id: string; level: 2 | 3; text: string };

/** Plain document text, excluding markup and structural nodes. */
export function getDocumentText(document: JSONContent) {
	const parts: string[] = [];
	visit(document, (node) => {
		if (node.type === "text" && node.text) parts.push(node.text);
	});
	return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function getWordCount(document: RichTextDocument) {
	const text = getDocumentText(document);
	return text ? text.split(/\s+/).length : 0;
}

export function getCharacterCount(document: RichTextDocument) {
	return getDocumentText(document).length;
}

export function getEstimatedReadingTime(
	document: RichTextDocument,
	wordsPerMinute = 200,
) {
	if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) return 0;
	return Math.ceil(getWordCount(document) / wordsPerMinute);
}

export function extractDocumentHeadings(
	document: RichTextDocument,
): DocumentHeading[] {
	const headings: DocumentHeading[] = [];
	visit(document, (node) => {
		const level = node.type === "heading" ? node.attrs?.level : undefined;
		if (level !== 2 && level !== 3) return;
		headings.push({
			id: `heading-${headings.length + 1}`,
			level,
			text: getDocumentText(node),
		});
	});
	return headings;
}

function visit(node: JSONContent, callback: (node: JSONContent) => void) {
	callback(node);
	for (const child of node.content ?? []) visit(child, callback);
}
