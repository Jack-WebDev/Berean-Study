/**
 * UI-independent rich-text document contract and utilities.
 *
 * Persistence adapters may depend on this entry point without importing React
 * editor components.
 */

export type { RichTextDocument, RichTextNode } from "./document-types";
export type {
	DocumentHeading,
	DocumentSection,
	DocumentVerseBlock,
	DocumentVerseReference,
} from "./document-utils";
export {
	extractDocumentHeadings,
	getCharacterCount,
	getDocumentSections,
	getDocumentSectionTexts,
	getDocumentText,
	getDocumentVerseBlocks,
	getDocumentVerseReferences,
	getEstimatedReadingTime,
	getExcerpt,
	getLinkedVerseCount,
	getOpenTaskCount,
	getPlainText,
	getWordCount,
} from "./document-utils";
export {
	emptyRichTextDocument,
	hasRichTextContent,
	isRichTextDocument,
	normalizeRichTextDocument,
} from "./document-validation";
export type { TemplateSection } from "./templates";
export {
	createReflectionTemplate,
	createTemplateSection,
	createTestimonyTemplate,
	testimonyTemplateSections,
} from "./templates";
export { formatVerseReference, isValidVerseBlock } from "./verse-reference";
