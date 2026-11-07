import {
	getCommentaryReviewText,
	getDocumentCommentaryNodes,
	getWordCount,
	hasRichTextContent,
	isRichTextDocument,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { z } from "zod";

import { parseOutlineRange } from "./book-overview";

/*
 * What a commentary says, and the rules for its sections and verse coverage. This
 * file has no database imports so the browser can run the same checks as the server.
 */

export const commentaryKinds = [
	"book_introduction",
	"passage_commentary",
	"verse_commentary",
] as const;
export type CommentaryKind = (typeof commentaryKinds)[number];

export const commentaryKindLabels: Record<CommentaryKind, string> = {
	book_introduction: "Book introduction",
	passage_commentary: "Passage commentary",
	verse_commentary: "Verse commentary",
};

export function isCommentaryKind(kind: string): kind is CommentaryKind {
	return (commentaryKinds as readonly string[]).includes(kind);
}

export type VersePoint = { chapter: number; verse: number };
export type VerseRange = { from: VersePoint; to: VersePoint };

/** What a commentary covers. It's part of the commentary's identity, so it never changes. */
export type CommentaryScope =
	| { kind: "book_introduction"; bookSlug: string }
	| ({
			kind: "passage_commentary" | "verse_commentary";
			bookSlug: string;
	  } & VerseRange);

const pointText = ({ chapter, verse }: VersePoint) => `${chapter}:${verse}`;

export function commentaryScopeKey(scope: CommentaryScope) {
	if (scope.kind === "book_introduction") return scope.bookSlug;
	if (scope.kind === "verse_commentary") {
		return `${scope.bookSlug}:${pointText(scope.from)}`;
	}
	return `${scope.bookSlug}:${pointText(scope.from)}-${pointText(scope.to)}`;
}

/** Reads a scope back from its key. Null if the key doesn't fit the kind. */
export function parseCommentaryScopeKey(
	kind: CommentaryKind,
	key: string,
): CommentaryScope | null {
	if (kind === "book_introduction") {
		return /^[a-z0-9-]+$/.test(key) ? { bookSlug: key, kind } : null;
	}
	const match = /^([a-z0-9-]+):(\d+):(\d+)(?:-(\d+):(\d+))?$/.exec(key);
	if (!match?.[1]) return null;
	const from = { chapter: Number(match[2]), verse: Number(match[3]) };
	const hasEnd = match[4] !== undefined;
	if ((kind === "verse_commentary") === hasEnd) return null;
	const to = hasEnd
		? { chapter: Number(match[4]), verse: Number(match[5]) }
		: from;
	if (from.chapter < 1 || from.verse < 1 || comparePoints(from, to) > 0) {
		return null;
	}
	return { bookSlug: match[1], from, kind, to };
}

function comparePoints(a: VersePoint, b: VersePoint) {
	return a.chapter - b.chapter || a.verse - b.verse;
}

export function rangesOverlap(a: VerseRange, b: VerseRange) {
	return comparePoints(a.from, b.to) <= 0 && comparePoints(b.from, a.to) <= 0;
}

export function rangeContains(range: VerseRange, point: VersePoint) {
	return (
		comparePoints(range.from, point) <= 0 && comparePoints(point, range.to) <= 0
	);
}

export const richTextBody = z.custom<RichTextDocument>(isRichTextDocument, {
	message: "This section's text couldn't be read.",
});

export const commentaryBodySchema = z.object({
	title: z.string().trim().max(200),
	sections: z
		.array(
			z.object({
				/** Stays the same through renames and moves, so the editor can follow a section. */
				key: z.string().min(1).max(64),
				title: z.string().trim().max(200),
				/** The verses it covers, as typed. Blank means all of the commentary's verses. */
				range: z.string().trim().max(40),
				body: richTextBody,
			}),
		)
		.max(60),
});

export type CommentaryBody = z.infer<typeof commentaryBodySchema>;
export type CommentarySection = CommentaryBody["sections"][number];

export const emptyCommentaryBody: CommentaryBody = { sections: [], title: "" };

const emptyDocument: RichTextDocument = {
	content: [{ type: "paragraph" }],
	type: "doc",
};

export function newCommentarySection(
	key: string,
	title = "",
	range = "",
): CommentarySection {
	return { body: emptyDocument, key, range, title };
}

const suggestedIntroductionSections = [
	"Author",
	"Date & setting",
	"Audience",
	"Purpose",
	"Structure",
];

/** Where a new commentary starts. Introductions come with the usual sections to rename or remove. */
export function startingCommentaryBody(
	kind: CommentaryKind,
	bookName: string,
	createKey: () => string,
): CommentaryBody {
	if (kind === "book_introduction") {
		return {
			sections: suggestedIntroductionSections.map((title) =>
				newCommentarySection(createKey(), title),
			),
			title: `Introduction to ${bookName}`,
		};
	}
	return {
		sections: [
			newCommentarySection(
				createKey(),
				kind === "verse_commentary" ? "Note" : "",
			),
		],
		title: "",
	};
}

/**
 * Reads what a section says it covers. Inside one chapter, plain numbers mean
 * verses, so "18–22" works. Returns null if it can't be read. A section that names
 * a whole chapter runs to that chapter's last verse, whatever that turns out to be.
 */
export function parseSectionRange(
	text: string,
	scope: VerseRange,
): VerseRange | null {
	const trimmed = text.trim();
	if (!trimmed) return { from: scope.from, to: scope.to };

	const singleChapter = scope.from.chapter === scope.to.chapter;
	const verses = /^(\d+)(?:\s*[-–—]\s*(\d+))?$/.exec(trimmed);
	if (singleChapter && verses) {
		const from = Number(verses[1]);
		const to = verses[2] ? Number(verses[2]) : from;
		if (from < 1 || to < from) return null;
		const { chapter } = scope.from;
		return {
			from: { chapter, verse: from },
			to: { chapter, verse: to },
		};
	}

	const parsed = parseOutlineRange(trimmed);
	if (!parsed) return null;
	return {
		from: { chapter: parsed.from.chapter, verse: parsed.from.verse ?? 1 },
		to: {
			chapter: parsed.to.chapter,
			verse: parsed.to.verse ?? Number.MAX_SAFE_INTEGER,
		},
	};
}

export type CoverageCell = VersePoint & { covered: boolean };

/**
 * One cell per verse in a commentary's range, saying whether any section covers it.
 * Chapters between the ends need a verse count, which only exists once verses have
 * been entered. Without one, the chapter is listed in `unknownChapters` and its
 * cells stop at the last verse a section mentions.
 */
export function commentaryCoverage(
	scope: VerseRange,
	sections: readonly Pick<CommentarySection, "range">[],
	verseCounts: Readonly<Record<number, number>>,
) {
	const ranges = sections.flatMap(({ range }) => {
		const parsed = parseSectionRange(range, scope);
		return parsed ? [parsed] : [];
	});

	const cells: CoverageCell[] = [];
	const unknownChapters: number[] = [];
	for (
		let chapter = scope.from.chapter;
		chapter <= scope.to.chapter;
		chapter += 1
	) {
		const first = chapter === scope.from.chapter ? scope.from.verse : 1;
		let last =
			chapter === scope.to.chapter ? scope.to.verse : verseCounts[chapter];
		if (last === undefined) {
			unknownChapters.push(chapter);
			last = Math.max(
				first,
				...ranges.flatMap(({ to }) =>
					to.chapter === chapter && to.verse < Number.MAX_SAFE_INTEGER
						? [to.verse]
						: [],
				),
			);
		}
		for (let verse = first; verse <= last; verse += 1) {
			const point = { chapter, verse };
			cells.push({
				...point,
				covered: ranges.some((range) => rangeContains(range, point)),
			});
		}
	}

	return {
		cells,
		gaps: cells.filter(({ covered }) => !covered),
		unknownChapters,
	};
}

/** Verses written so a reader can follow them: "23, 24", or "7:25, 8:1" across chapters. */
export function formatCoverageGaps(
	gaps: readonly VersePoint[],
	scope: VerseRange,
) {
	const singleChapter = scope.from.chapter === scope.to.chapter;
	return gaps
		.map((gap) => (singleChapter ? String(gap.verse) : pointText(gap)))
		.join(", ");
}

export type ChecklistItem = {
	/** A blocking item stops the draft going for review. Others only prompt. */
	blocking: boolean;
	ok: boolean;
	text: string;
};

function scopeRange(scope: CommentaryScope): VerseRange | null {
	return scope.kind === "book_introduction" ? null : scope;
}

/** The Before review list. Only unfinished work blocks. The reviewer judges the rest. */
export function commentaryChecklist(
	scope: CommentaryScope,
	body: CommentaryBody,
	verseCounts: Readonly<Record<number, number>> = {},
): ChecklistItem[] {
	const items: ChecklistItem[] = [
		{ blocking: true, ok: Boolean(body.title), text: "Has a title" },
		{
			blocking: true,
			ok:
				body.sections.length > 0 &&
				body.sections.every(
					({ body: text, title }) => title && hasRichTextContent(text),
				),
			text: "Every section has a title and some writing",
		},
	];

	const range = scopeRange(scope);
	if (range) {
		const outside = body.sections.filter((section) => {
			const parsed = parseSectionRange(section.range, range);
			return (
				!parsed ||
				!rangeContains(range, parsed.from) ||
				(parsed.to.verse < Number.MAX_SAFE_INTEGER &&
					!rangeContains(range, parsed.to))
			);
		});
		items.push({
			blocking: true,
			ok: outside.length === 0,
			text:
				outside.length === 0
					? "Sections stay inside this passage"
					: `Check the verses of ${outside.map(({ title }) => title || "an untitled section").join(", ")}`,
		});
	}

	const citations = collectCitations(body);
	const missingPages = citations.flatMap(({ locator }, index) =>
		locator.trim() ? [] : [index + 1],
	);
	items.push({
		blocking: false,
		ok: citations.length > 0,
		text:
			citations.length > 0
				? `${citations.length} ${citations.length === 1 ? "citation" : "citations"} added`
				: "No citations yet",
	});
	if (missingPages.length > 0) {
		items.push({
			blocking: false,
			ok: false,
			text: `${missingPages.length === 1 ? "Citation" : "Citations"} ${missingPages.join(", ")} ${missingPages.length === 1 ? "is" : "are"} missing page numbers`,
		});
	}

	if (scope.kind === "passage_commentary") {
		const { gaps } = commentaryCoverage(scope, body.sections, verseCounts);
		items.push({
			blocking: false,
			ok: gaps.length === 0,
			text:
				gaps.length === 0
					? "Every verse is covered"
					: `${gaps.length === 1 ? "Verse" : "Verses"} ${formatCoverageGaps(gaps, scope)} ${gaps.length === 1 ? "is" : "are"} not covered by any section`,
		});
	}
	return items;
}

export function commentaryProblems(
	scope: CommentaryScope,
	body: CommentaryBody,
) {
	return commentaryChecklist(scope, body)
		.filter(({ blocking, ok }) => blocking && !ok)
		.map(({ text }) => text);
}

const nodesOf = (body: CommentaryBody) =>
	body.sections.map((section) => getDocumentCommentaryNodes(section.body));

/** Every citation, numbered the way readers see them: in order, across sections. */
export function collectCitations(body: CommentaryBody) {
	return nodesOf(body).flatMap(({ citations }) => citations);
}

export function collectScriptureReferences(body: CommentaryBody) {
	return nodesOf(body).flatMap(
		({ scriptureReferences }) => scriptureReferences,
	);
}

/** Whether a Greek Reviewer has to look at this draft. */
export function containsOriginalTerm(body: CommentaryBody) {
	return nodesOf(body).some(({ originalTerms }) => originalTerms.length > 0);
}

/** How many citations come before each section, so numbering runs through the commentary. */
export function citationOffset(body: CommentaryBody, sectionKey: string) {
	let offset = 0;
	for (const section of body.sections) {
		if (section.key === sectionKey) return offset;
		offset += getDocumentCommentaryNodes(section.body).citations.length;
	}
	return offset;
}

export function commentaryCounts(body: CommentaryBody) {
	return {
		citations: collectCitations(body).length,
		references: collectScriptureReferences(body).length,
		words: body.sections.reduce(
			(total, section) => total + getWordCount(section.body),
			0,
		),
	};
}

/**
 * Each part as text for comparing revisions. Order, titles and verses are listed
 * together first, so a reviewer sees a section moved even if its words didn't change.
 */
export function commentaryFields(body: CommentaryBody) {
	const seen = new Map<string, number>();
	return [
		{ label: "Title", text: body.title },
		{
			label: "Sections",
			text: body.sections
				.map(
					({ range, title }, index) =>
						`${index + 1}. ${title || "Untitled"}${range ? ` (${range})` : ""}`,
				)
				.join("\n"),
		},
		...body.sections.map(({ body: text, title }) => {
			const name = title || "Untitled";
			const count = (seen.get(name) ?? 0) + 1;
			seen.set(name, count);
			return {
				label: count > 1 ? `Section: ${name} (${count})` : `Section: ${name}`,
				text: getCommentaryReviewText(text),
			};
		}),
	];
}
