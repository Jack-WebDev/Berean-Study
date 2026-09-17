import type { JSONContent } from "@tiptap/core";

import { isValidBibleReference } from "./bible-reference";
import { isValidCitation } from "./citation";
import type {
	BibleReferenceAttributes,
	CitationAttributes,
	DocumentReferences,
	RichTextDocument,
} from "./types";

/** Returns valid structured passage references in document order. */
export function getDocumentBibleReferences(
	document: RichTextDocument,
): BibleReferenceAttributes[] {
	const references: BibleReferenceAttributes[] = [];
	visit(document, (node) => {
		if (node.type !== "bibleReference") return;
		const reference = node.attrs as
			| Partial<BibleReferenceAttributes>
			| undefined;
		if (isValidBibleReference(reference)) references.push(reference);
	});
	return references;
}

/** Returns valid structured citations in document order. */
export function getDocumentCitations(
	document: RichTextDocument,
): CitationAttributes[] {
	const citations: CitationAttributes[] = [];
	visit(document, (node) => {
		if (node.type !== "citation") return;
		const citation = node.attrs as Partial<CitationAttributes> | undefined;
		if (isValidCitation(citation)) citations.push(citation);
	});
	return citations;
}

/** Returns all structured references used by a document. */
export function getDocumentReferences(
	document: RichTextDocument,
): DocumentReferences {
	return {
		bibleReferences: getDocumentBibleReferences(document),
		citations: getDocumentCitations(document),
	};
}

function visit(node: JSONContent, callback: (node: JSONContent) => void) {
	callback(node);
	for (const child of node.content ?? []) visit(child, callback);
}
