import {
	emptyRichTextDocument,
	getDocumentText,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";

export function parseReflectionContent(content: string): RichTextDocument {
	try {
		const document = JSON.parse(content) as RichTextDocument;
		if (document.type === "doc") return document;
	} catch {}
	return emptyRichTextDocument;
}

export function getReflectionExcerpt(content: string, maxLength = 160) {
	const text = getDocumentText(parseReflectionContent(content)).trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength).trimEnd()}…`;
}
