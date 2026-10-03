import {
	emptyRichTextDocument,
	getDocumentText,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";

/**
 * Prayers and reflections keep their rich-text document as JSON in the
 * established text column. Plain-text records remain readable and editable.
 */
export function parsePrayerContent(content: string): RichTextDocument {
	try {
		const parsed: unknown = JSON.parse(content);
		if (isRichTextDocument(parsed)) return parsed;
	} catch {
		// Legacy prayer content is plain text.
	}

	if (!content.trim()) return emptyRichTextDocument;
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

export function getPrayerContentText(content: string) {
	return getDocumentText(parsePrayerContent(content));
}

export function getPrayerContentExcerpt(content: string, maxLength = 160) {
	const text = getPrayerContentText(content);
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength).trimEnd()}…`;
}

function isRichTextDocument(value: unknown): value is RichTextDocument {
	if (!value || typeof value !== "object") return false;
	const document = value as { content?: unknown; type?: unknown };
	return document.type === "doc" && Array.isArray(document.content);
}
