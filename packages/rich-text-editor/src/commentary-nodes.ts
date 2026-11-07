import type { JSONContent } from "@tiptap/core";

import type {
	CitationAttributes,
	ContentBlockAttributes,
	OriginalTermAttributes,
	ScriptureReferenceAttributes,
} from "./document-types";

const nonEmptyText = (value: unknown): value is string =>
	typeof value === "string" && value.trim().length > 0;

export function isValidCitation(
	citation: Partial<CitationAttributes> | null | undefined,
): citation is CitationAttributes {
	const excerptId = citation?.excerptId;
	return Boolean(
		citation &&
			typeof excerptId === "number" &&
			Number.isInteger(excerptId) &&
			excerptId > 0 &&
			nonEmptyText(citation.label) &&
			typeof citation.locator === "string" &&
			(citation.strength === "direct" ||
				citation.strength === "partial" ||
				citation.strength === "background"),
	);
}

export function isValidScriptureReference(
	reference: Partial<ScriptureReferenceAttributes> | null | undefined,
): reference is ScriptureReferenceAttributes {
	return Boolean(
		reference &&
			nonEmptyText(reference.bookSlug) &&
			nonEmptyText(reference.label) &&
			(reference.variant === "reference" || reference.variant === "cross"),
	);
}

export function isValidOriginalTerm(
	term: Partial<OriginalTermAttributes> | null | undefined,
): term is OriginalTermAttributes {
	return Boolean(
		term &&
			nonEmptyText(term.word) &&
			typeof term.gloss === "string" &&
			(term.noteScopeKey === undefined ||
				term.noteScopeKey === null ||
				nonEmptyText(term.noteScopeKey)) &&
			(term.language === "greek" || term.language === "hebrew"),
	);
}

export const contentBlockKindLabels: Record<
	ContentBlockAttributes["kind"],
	string
> = {
	cross_reference: "Cross-reference",
	interpretive_question: "Interpretive question",
	textual_note: "Textual note",
};

export function isValidContentBlock(
	block: Partial<ContentBlockAttributes> | null | undefined,
): block is ContentBlockAttributes {
	return Boolean(
		block &&
			nonEmptyText(block.scopeKey) &&
			nonEmptyText(block.label) &&
			typeof block.kind === "string" &&
			block.kind in contentBlockKindLabels,
	);
}

/** Every commentary tool used in a document, in reading order. */
export function getDocumentCommentaryNodes(document: JSONContent) {
	const citations: CitationAttributes[] = [];
	const contentBlocks: ContentBlockAttributes[] = [];
	const originalTerms: OriginalTermAttributes[] = [];
	const scriptureReferences: ScriptureReferenceAttributes[] = [];
	const visit = (node: JSONContent) => {
		const attrs = node.attrs as Record<string, unknown> | undefined;
		if (node.type === "citation" && isValidCitation(attrs)) {
			citations.push(attrs);
		}
		if (node.type === "contentBlock" && isValidContentBlock(attrs)) {
			contentBlocks.push(attrs);
		}
		if (node.type === "originalTerm" && isValidOriginalTerm(attrs)) {
			originalTerms.push(attrs);
		}
		if (
			node.type === "scriptureReference" &&
			isValidScriptureReference(attrs)
		) {
			scriptureReferences.push(attrs);
		}
		for (const child of node.content ?? []) visit(child);
	};
	visit(document);
	return { citations, contentBlocks, originalTerms, scriptureReferences };
}

/**
 * The document's words with one line per block, including what its chips say.
 * Reviewers compare this between revisions, so an added reference or a changed
 * page number shows up as a change.
 */
export function getCommentaryReviewText(document: JSONContent) {
	const inlineText = (node: JSONContent): string => {
		const attrs = node.attrs as Record<string, unknown> | undefined;
		if (node.type === "text") return node.text ?? "";
		if (node.type === "hardBreak") return " ";
		if (node.type === "citation" && isValidCitation(attrs)) {
			return ` [${attrs.label}${attrs.locator ? `, ${attrs.locator}` : ""}]`;
		}
		if (
			node.type === "scriptureReference" &&
			isValidScriptureReference(attrs)
		) {
			return attrs.label;
		}
		if (node.type === "originalTerm" && isValidOriginalTerm(attrs)) {
			return attrs.word;
		}
		return "";
	};
	const isInline = (node: JSONContent) =>
		node.type === "text" ||
		node.type === "hardBreak" ||
		node.type === "citation" ||
		node.type === "scriptureReference" ||
		node.type === "originalTerm" ||
		node.type === "bibleReference";

	const lines: string[] = [];
	const collect = (node: JSONContent) => {
		const attrs = node.attrs as Record<string, unknown> | undefined;
		if (node.type === "contentBlock" && isValidContentBlock(attrs)) {
			lines.push(`[${contentBlockKindLabels[attrs.kind]}: ${attrs.label}]`);
			return;
		}
		if (!node.content?.some(isInline)) {
			for (const child of node.content ?? []) collect(child);
			return;
		}
		const line = node.content.map(inlineText).join("").replace(/\s+/g, " ");
		if (line.trim()) lines.push(line.trim());
	};
	collect(document);
	return lines.join("\n");
}
