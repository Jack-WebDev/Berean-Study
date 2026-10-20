import {
	emptyRichTextDocument,
	normalizeRichTextDocument,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";

/** Converts a document to the text-column representation used by Postgres. */
export function serializeRichTextDocument(document: RichTextDocument): string {
	return JSON.stringify(normalizeRichTextDocument(document));
}

/** Converts a stored text column back to the document exposed by repositories. */
export function parseStoredRichText(content: string): RichTextDocument {
	try {
		return normalizeRichTextDocument(JSON.parse(content) as unknown);
	} catch {
		return emptyRichTextDocument;
	}
}
