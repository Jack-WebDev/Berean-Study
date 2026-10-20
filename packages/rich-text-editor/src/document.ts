/**
 * UI-independent rich-text document contract and utilities.
 *
 * Persistence adapters may depend on this entry point without importing React
 * editor components.
 */

export type { RichTextDocument, RichTextNode } from "./document-types";
export type { DocumentHeading } from "./document-utils";
export {
	extractDocumentHeadings,
	getCharacterCount,
	getDocumentText,
	getEstimatedReadingTime,
	getWordCount,
} from "./document-utils";
export {
	emptyRichTextDocument,
	hasRichTextContent,
	isRichTextDocument,
	normalizeRichTextDocument,
} from "./document-validation";
