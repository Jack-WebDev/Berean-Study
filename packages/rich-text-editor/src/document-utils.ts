import type { JSONContent } from "@tiptap/core";
import type {
	RichTextDocument,
	SectionVariant,
	VerseBlockAttributes,
} from "./document-types";
import { formatVerseReference, isValidVerseBlock } from "./verse-reference";

export type DocumentHeading = { id: string; level: 1 | 2 | 3; text: string };

/** One outline section: a section heading and the blocks until the next one. */
export type DocumentSection = {
	index: number;
	paragraphs: number;
	tasks: { done: number; total: number };
	text: string;
	variant: SectionVariant | null;
	verses: number;
};

export type DocumentVerseBlock = {
	attributes: VerseBlockAttributes;
	/** Position among all Verse block nodes, for editor navigation. */
	nodeIndex: number;
	/** Index into `getDocumentSections`, or null before the first section. */
	sectionIndex: number | null;
};

/** Plain document text, excluding markup and structural nodes. */
export function getDocumentText(document: JSONContent) {
	const parts: string[] = [];
	visit(document, (node) => {
		if (node.type === "text" && node.text) parts.push(node.text);
	});
	return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * The document's words with one line per block. Unlike `getDocumentText`, a
 * word split across formatting ("**Lo**rd") stays whole. Verse blocks are left
 * out: their references are stored separately and their text isn't the
 * writer's own words.
 */
export function getPlainText(
	document: JSONContent,
	options: { skipHeadings?: boolean } = {},
) {
	const lines: string[] = [];
	const collect = (node: JSONContent) => {
		if (node.type === "verseBlock") return;
		if (node.type === "heading" && options.skipHeadings) return;
		const isTextBlock = node.content?.some(isInlineNode);
		if (!isTextBlock) {
			for (const child of node.content ?? []) collect(child);
			return;
		}
		const line = (node.content ?? [])
			.map(getInlineText)
			.join("")
			.replace(/\s+/g, " ")
			.trim();
		if (line) lines.push(line);
	};
	collect(document);
	return lines.join("\n");
}

/** A short single-line preview for cards and lists, cut at a word boundary. */
export function getExcerpt(
	document: JSONContent,
	maxLength = 180,
	options: { skipHeadings?: boolean } = {},
) {
	const text = getPlainText(document, options).replace(/\s+/g, " ");
	if (text.length <= maxLength) return text;
	const cut = text.slice(0, maxLength + 1);
	const lastSpace = cut.lastIndexOf(" ");
	return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut.slice(0, maxLength)).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/**
 * Splits a document at its top-level headings, so a templated entry can be
 * shown as side-by-side parts. Text before the first heading has an empty
 * heading.
 */
export function getDocumentSectionTexts(
	document: RichTextDocument,
): { heading: string; text: string }[] {
	const sections: { heading: string; text: string }[] = [];
	for (const block of document.content ?? []) {
		if (block.type === "heading") {
			sections.push({ heading: getPlainText(block), text: "" });
			continue;
		}
		const text = getPlainText(block);
		if (!text) continue;
		const section = sections.at(-1);
		if (section)
			section.text = section.text ? `${section.text}\n${text}` : text;
		else sections.push({ heading: "", text });
	}
	return sections;
}

export function getWordCount(document: RichTextDocument) {
	const text = getDocumentText(document);
	return text ? text.split(/\s+/).length : 0;
}

export function getCharacterCount(document: RichTextDocument) {
	return getDocumentText(document).length;
}

export function getEstimatedReadingTime(
	document: RichTextDocument,
	wordsPerMinute = 200,
) {
	if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) return 0;
	return Math.ceil(getWordCount(document) / wordsPerMinute);
}

export function extractDocumentHeadings(
	document: RichTextDocument,
): DocumentHeading[] {
	const headings: DocumentHeading[] = [];
	visit(document, (node) => {
		const level = node.type === "heading" ? node.attrs?.level : undefined;
		if (level !== 1 && level !== 2 && level !== 3) return;
		headings.push({
			id: `heading-${headings.length + 1}`,
			level,
			text: getDocumentText(node),
		});
	});
	return headings;
}

/**
 * Top-level headings that start an outline section: template headings (which
 * carry a variant) and H1/H2. H3 stays inside the section it belongs to.
 */
export function isSectionHeading(node: JSONContent) {
	if (node.type !== "heading") return false;
	return (
		Boolean(node.attrs?.variant) ||
		node.attrs?.level === 1 ||
		node.attrs?.level === 2
	);
}

export function getDocumentSections(
	document: RichTextDocument,
): DocumentSection[] {
	const sections: DocumentSection[] = [];
	for (const block of document.content ?? []) {
		if (isSectionHeading(block)) {
			sections.push({
				index: sections.length,
				paragraphs: 0,
				tasks: { done: 0, total: 0 },
				text: getDocumentText(block),
				variant: toSectionVariant(block.attrs?.variant),
				verses: 0,
			});
			continue;
		}
		const section = sections.at(-1);
		if (!section) continue;
		if (block.type === "paragraph" && getDocumentText(block))
			section.paragraphs++;
		visit(block, (node) => {
			if (node.type === "verseBlock") section.verses++;
			if (node.type !== "taskItem") return;
			section.tasks.total++;
			if (node.attrs?.checked) section.tasks.done++;
		});
	}
	return sections;
}

/** Valid Verse blocks in document order, with the section each sits in. */
export function getDocumentVerseBlocks(
	document: RichTextDocument,
): DocumentVerseBlock[] {
	const verseBlocks: DocumentVerseBlock[] = [];
	let sectionIndex: number | null = null;
	let nodeIndex = 0;
	for (const block of document.content ?? []) {
		if (isSectionHeading(block)) sectionIndex = (sectionIndex ?? -1) + 1;
		visit(block, (node) => {
			if (node.type !== "verseBlock") return;
			const attributes = node.attrs as
				| Partial<VerseBlockAttributes>
				| undefined;
			if (isValidVerseBlock(attributes))
				verseBlocks.push({ attributes, nodeIndex, sectionIndex });
			nodeIndex++;
		});
	}
	return verseBlocks;
}

/** A verse quoted in a document, as it would be listed for the reader. */
export type DocumentVerseReference = {
	attributes: VerseBlockAttributes;
	/** "James 1:5" or "Acts 17:10–12". */
	label: string;
	passageId: number;
	translation: string;
};

/**
 * Each verse the document quotes, once, in the order it first appears. The
 * same verse in two translations counts as two.
 */
export function getDocumentVerseReferences(
	document: RichTextDocument,
): DocumentVerseReference[] {
	const seen = new Set<string>();
	const references: DocumentVerseReference[] = [];
	for (const { attributes } of getDocumentVerseBlocks(document)) {
		const label = formatVerseReference(attributes);
		const key = `${label}|${attributes.translation}`;
		if (seen.has(key)) continue;
		seen.add(key);
		references.push({
			attributes,
			label,
			passageId: attributes.passageId,
			translation: attributes.translation,
		});
	}
	return references;
}

/** Counts every verse quoted by the document's Verse blocks. */
export function getLinkedVerseCount(document: RichTextDocument) {
	return getDocumentVerseBlocks(document).reduce(
		(total, { attributes }) =>
			total + attributes.verseEnd - attributes.verseStart + 1,
		0,
	);
}

export function getOpenTaskCount(document: RichTextDocument) {
	let open = 0;
	visit(document, (node) => {
		if (node.type === "taskItem" && !node.attrs?.checked) open++;
	});
	return open;
}

function toSectionVariant(value: unknown): SectionVariant | null {
	return value === "apply" ||
		value === "interpret" ||
		value === "observe" ||
		value === "section"
		? value
		: null;
}

const inlineNodeTypes = new Set([
	"bibleReference",
	"citation",
	"hardBreak",
	"text",
]);

function isInlineNode(node: JSONContent) {
	return inlineNodeTypes.has(node.type ?? "");
}

function getInlineText(node: JSONContent): string {
	if (node.type === "text") return node.text ?? "";
	if (node.type === "hardBreak") return " ";
	if (node.type === "bibleReference" && typeof node.attrs?.label === "string")
		return node.attrs.label;
	return "";
}

function visit(node: JSONContent, callback: (node: JSONContent) => void) {
	callback(node);
	for (const child of node.content ?? []) visit(child, callback);
}
