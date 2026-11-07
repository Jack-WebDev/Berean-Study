/**
 * UI-independent rich-text document contract and utilities.
 *
 * Persistence adapters may depend on this entry point without importing React
 * editor components.
 */

export {
	contentBlockKindLabels,
	getCommentaryReviewText,
	getDocumentCommentaryNodes,
	isValidCitation,
	isValidContentBlock,
	isValidOriginalTerm,
	isValidScriptureReference,
} from "./commentary-nodes";
export type {
	CitationAttributes,
	CitationStrength,
	ContentBlockAttributes,
	ContentBlockKind,
	OriginalTermAttributes,
	RichTextDocument,
	RichTextNode,
	ScriptureReferenceAttributes,
} from "./document-types";
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
