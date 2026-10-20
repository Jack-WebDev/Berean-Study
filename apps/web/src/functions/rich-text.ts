import {
	hasRichTextContent,
	isRichTextDocument,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { z } from "zod";

/** Validates the structured document accepted by authored-content server functions. */
export const richTextDocumentSchema = z
	.custom<RichTextDocument>(
		isRichTextDocument,
		"Expected a rich-text document.",
	)
	.refine(hasRichTextContent, "Document must contain content.");
