import type { JSONContent } from "@tiptap/core";

import { isValidBibleReference } from "./bible-reference";
import type { BibleReferenceAttributes, RichTextDocument } from "./types";

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

function visit(node: JSONContent, callback: (node: JSONContent) => void) {
	callback(node);
	for (const child of node.content ?? []) visit(child, callback);
}
