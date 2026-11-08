import {
	getDocumentCommentaryNodes,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { type AnyPgColumn, alias } from "drizzle-orm/pg-core";

import {
	commentaryBodySchema,
	parseCommentaryScopeKey,
	parseSectionRange,
	rangesOverlap,
	type VerseRange,
} from "./commentary-body";
import {
	canonicalRelationshipBodySchema,
	crossReferenceBodySchema,
	parseConnectionScopeKey,
} from "./connection-body";
import { contentAtPassage } from "./content-links";
import { raiseIssue } from "./content-workflow";
import type { DbExecutor } from "./db-executor";
import { excerptBodySchema, sourceBodySchema } from "./evidence-body";
import { GovernanceError } from "./governance-error";
import { questionBodySchema } from "./interpretation-body";
import {
	type NoteLanguage,
	originalLanguageNoteBodySchema,
	textualNoteBodySchema,
	textualVariantBodySchema,
} from "./language-body";
import { type PassageRange, parsePassageKey } from "./passage-key";
import {
	limitWords,
	maxReaderQuoteWords,
	relatedVerseKindLabels,
	type StudyGroupKey,
	type StudyProblemType,
	selectionLabel,
	sourceSupportLabels,
	studyContentKinds,
	studyGroupOfKind,
	studyGroups,
	testamentLinkKindLabels,
	variantConfidenceReaderLabels,
	verseRuns,
} from "./reader-catalogue";
import { books } from "./schema/books";
import { citations } from "./schema/citations";
import { contentIssues } from "./schema/content_issues";
import { contentItems } from "./schema/content_items";
import { contentRevisions } from "./schema/content_revisions";
import { sourceExcerpts } from "./schema/source_excerpts";
import { readPassageKey } from "./scripture-reference";
import { publishedPassageText } from "./study-content";

/*
 * The study panel's notes for the verses a reader chose (HANDOFF Screen 3). Only
 * live content, only the groups that have something, in panel order, and in the
 * plain words of HANDOFF §9. Each note carries the revision it came from, so a
 * problem report points at the exact words the reader saw.
 */

/** A piece of writing, and the number its first citation takes. */
export type StudyWriting = {
	document: RichTextDocument;
	/** Citations are numbered straight through a note, across all its writing. */
	firstCitation: number;
};

/** What a numbered citation in a note points to. */
export type StudySource = {
	/** Who wrote it and when, such as "Douglas J. Moo · 1996". */
	byline: string;
	/** Where, and how firmly it backs the note: "p. 214 · Strongly supports this statement". */
	detail: string;
	/** In our own words, rather than a quotation. */
	isSummary: boolean;
	number: number;
	/** Cut to 75 words. */
	quote: string | null;
	title: string;
};

type StudyItemBase = {
	/** The content item, stable across revisions. */
	key: string;
	/** Names the note in the Report a problem form. */
	reportLabel: string;
	revisionId: number;
	sources: StudySource[];
};

/** Verses a note points to, with their words in the translation being read. */
export type StudyPassage = {
	bookSlug: string;
	chapter: number;
	/** One of the verses the reader is studying, so there's nowhere to go. */
	isChosen: boolean;
	label: string;
	text: string | null;
	verse: number;
};

export type StudyItem =
	| (StudyItemBase & {
			kind: "explanation";
			sections: Array<{
				/** Covers the chosen verses. Other sections show with the full explanation. */
				aboutChosenVerses: boolean;
				key: string;
				title: string;
				writing: StudyWriting;
			}>;
			title: string;
	  })
	| (StudyItemBase & {
			gloss: string;
			kind: "word_meaning";
			language: NoteLanguage;
			lemma: string;
			note: StudyWriting;
			parsing: string;
			word: string;
	  })
	| (StudyItemBase & {
			kind: "different_views";
			question: string;
			/** Berean Study names no preferred view. */
			takesNoSide: boolean;
			views: Array<{
				argument: StudyWriting;
				heldBy: string[];
				key: string;
				name: string;
				preferred: boolean;
			}>;
			whyItMatters: string;
	  })
	| (StudyItemBase & {
			kind: "related_verse";
			kindLabel: string | null;
			note: string;
			passage: StudyPassage;
	  })
	| (StudyItemBase & {
			kind: "testament_link";
			kindLabel: string | null;
			newTestament: StudyPassage;
			note: string;
			oldTestament: StudyPassage;
	  })
	| (StudyItemBase & {
			heading: string;
			kind: "text_note";
			note: StudyWriting;
	  })
	| (StudyItemBase & {
			confidenceLabel: string | null;
			kind: "text_variant";
			/** The language old copies are written in, so screen readers say the words properly. */
			language: NoteLanguage;
			location: string;
			readings: Array<{
				key: string;
				manuscripts: string[];
				meaning: string;
				preferred: boolean;
				text: string;
			}>;
			reason: StudyWriting;
	  });

export type StudyPanelGroup = {
	hint: string;
	items: StudyItem[];
	key: StudyGroupKey;
	name: string;
};

export type VerseStudy = {
	groups: StudyPanelGroup[];
	/** The chosen verses in words, such as "Romans 8:28–30". */
	reference: string;
};

type ChosenVerses = {
	bookSlug: string;
	chapter: number;
	translationAbbreviation: string;
	verses: readonly number[];
};

/** Numbers each piece of writing's citations on from the one before. */
export function numberWritings(documents: readonly RichTextDocument[]) {
	let next = 1;
	return documents.map((document): StudyWriting => {
		const writing = { document, firstCitation: next };
		next += getDocumentCommentaryNodes(document).citations.length;
		return writing;
	});
}

type CitationRow = {
	excerptId: number;
	excerptRevisionId: number | null;
	position: number;
	sourceRevisionId: number | null;
};

/**
 * The excerpt and source behind each citation of these revisions: the versions
 * they were published with, or the live ones for anything published before
 * citations were pinned.
 */
export async function citationSources(
	client: DbExecutor,
	revisionIds: readonly number[],
) {
	const byRevision = new Map<number, CitationRow[]>();
	const bodies = new Map<number, unknown>();
	if (revisionIds.length === 0) return { bodies, byRevision };

	const excerptItem = alias(contentItems, "excerpt_item");
	const sourceItem = alias(contentItems, "source_item");
	const rows = await client
		.select({
			excerptId: citations.excerptId,
			excerptLive: excerptItem.liveRevisionId,
			pinnedExcerpt: citations.pinnedExcerptRevisionId,
			pinnedSource: citations.pinnedSourceRevisionId,
			position: citations.position,
			revisionId: citations.contentRevisionId,
			sourceLive: sourceItem.liveRevisionId,
		})
		.from(citations)
		.innerJoin(sourceExcerpts, eq(sourceExcerpts.id, citations.excerptId))
		.leftJoin(
			excerptItem,
			and(
				eq(excerptItem.kind, "source_excerpt"),
				eq(excerptItem.scopeKey, asText(sourceExcerpts.id)),
			),
		)
		.leftJoin(
			sourceItem,
			and(
				eq(sourceItem.kind, "source"),
				eq(sourceItem.scopeKey, asText(sourceExcerpts.sourceId)),
			),
		)
		.where(inArray(citations.contentRevisionId, [...revisionIds]));

	const wanted = new Set<number>();
	for (const row of rows) {
		const citation: CitationRow = {
			excerptId: row.excerptId,
			excerptRevisionId: row.pinnedExcerpt ?? row.excerptLive,
			position: row.position,
			sourceRevisionId: row.pinnedSource ?? row.sourceLive,
		};
		if (citation.excerptRevisionId) wanted.add(citation.excerptRevisionId);
		if (citation.sourceRevisionId) wanted.add(citation.sourceRevisionId);
		const list = byRevision.get(row.revisionId) ?? [];
		list.push(citation);
		byRevision.set(row.revisionId, list);
	}
	if (wanted.size > 0) {
		const revisions = await client
			.select({ body: contentRevisions.body, id: contentRevisions.id })
			.from(contentRevisions)
			.where(inArray(contentRevisions.id, [...wanted]));
		for (const { body, id } of revisions) bodies.set(id, body);
	}
	return { bodies, byRevision };
}

/** Content items name excerpts and sources by id, stored as text. */
function asText(column: AnyPgColumn) {
	return sql<string>`${column}::text`;
}

/** The sources a note's citations point to, numbered as they appear in its writing. */
export function sourcesFor(
	documents: readonly RichTextDocument[],
	rows: readonly CitationRow[],
	bodies: ReadonlyMap<number, unknown>,
): StudySource[] {
	const cited = documents.flatMap(
		(document) => getDocumentCommentaryNodes(document).citations,
	);
	return cited.map((citation, index) => {
		const row =
			rows.find(
				(candidate) =>
					candidate.position === index + 1 &&
					candidate.excerptId === citation.excerptId,
			) ?? rows.find((candidate) => candidate.excerptId === citation.excerptId);
		const excerpt = excerptBodySchema.safeParse(
			row?.excerptRevisionId ? bodies.get(row.excerptRevisionId) : undefined,
		);
		const source = sourceBodySchema.safeParse(
			row?.sourceRevisionId ? bodies.get(row.sourceRevisionId) : undefined,
		);
		const excerptBody = excerpt.success ? excerpt.data : null;
		const sourceBody = source.success ? source.data : null;
		return {
			byline: [sourceBody?.authors, sourceBody?.year]
				.filter(Boolean)
				.join(" · "),
			detail: [
				citation.locator.trim() || excerptBody?.location,
				sourceSupportLabels[citation.strength],
			]
				.filter(Boolean)
				.join(" · "),
			isSummary: excerptBody?.form === "summary",
			number: index + 1,
			quote: excerptBody?.text
				? limitWords(excerptBody.text, maxReaderQuoteWords)
				: null,
			title: sourceBody?.title || citation.label,
		};
	});
}

/** The verses a connection points to, ready to show and open. */
async function studyPassage(
	client: DbExecutor,
	key: string,
	translationAbbreviation: string,
	isChosen: boolean,
): Promise<StudyPassage | null> {
	const range = parsePassageKey(key);
	if (!range) return null;
	try {
		const { label } = await readPassageKey(client, key);
		return {
			bookSlug: range.bookSlug,
			chapter: range.from.chapter,
			isChosen,
			label,
			text: await publishedPassageText(client, range, translationAbbreviation),
			verse: range.from.verse,
		};
	} catch (error) {
		if (error instanceof GovernanceError) return null;
		throw error;
	}
}

/** Live study notes on the chosen verses, grouped for the study panel. */
export async function getVerseStudy(
	client: DbExecutor,
	input: ChosenVerses,
): Promise<VerseStudy | null> {
	const [book] = await client
		.select({ id: books.id, name: books.name, testament: books.testament })
		.from(books)
		.where(eq(books.slug, input.bookSlug));
	if (!book || input.verses.length === 0) return null;

	const { chapter } = input;
	const runs: VerseRange[] = verseRuns(input.verses).map(([first, last]) => ({
		from: { chapter, verse: first },
		to: { chapter, verse: last },
	}));
	const aboutChosen = (range: VerseRange) =>
		runs.some((run) => rangesOverlap(run, range));
	const isChosenEnd = (range: PassageRange | null) =>
		range !== null && range.bookSlug === input.bookSlug && aboutChosen(range);

	const found = new Map<
		number,
		Awaited<ReturnType<typeof contentAtPassage>>[number]
	>();
	for (const run of runs) {
		const rows = await contentAtPassage(
			client,
			{ bookId: book.id, ...run },
			{ kinds: studyContentKinds, revision: "live" },
		);
		for (const row of rows) found.set(row.contentItemId, row);
	}
	const rows = [...found.values()];
	const { bodies, byRevision } = await citationSources(
		client,
		rows.map((row) => row.revisionId),
	);

	const items = new Map<StudyGroupKey, StudyItem[]>();
	for (const row of rows) {
		const group = studyGroupOfKind(row.kind);
		if (!group) continue;
		const base = {
			key: String(row.contentItemId),
			revisionId: row.revisionId,
		};
		const sources = (documents: readonly RichTextDocument[]) =>
			sourcesFor(documents, byRevision.get(row.revisionId) ?? [], bodies);
		const item = await readItem(row, base, sources);
		if (!item) continue;
		items.set(group, [...(items.get(group) ?? []), item]);
	}

	async function readItem(
		row: (typeof rows)[number],
		base: { key: string; revisionId: number },
		sources: (documents: readonly RichTextDocument[]) => StudySource[],
	): Promise<StudyItem | null> {
		switch (row.kind) {
			case "verse_commentary":
			case "passage_commentary": {
				const parsed = commentaryBodySchema.safeParse(row.body);
				if (!parsed.success) return null;
				const body = parsed.data;
				const scope = parseCommentaryScopeKey(row.kind, row.scopeKey);
				const writings = numberWritings(
					body.sections.map((section) => section.body),
				);
				const sections = body.sections.map((section, index) => {
					const range =
						scope && scope.kind !== "book_introduction"
							? parseSectionRange(section.range, scope)
							: null;
					return {
						aboutChosenVerses: range ? aboutChosen(range) : true,
						key: section.key,
						title: section.title,
						writing: writings[index] as StudyWriting,
					};
				});
				// A section always shows, even if none says it covers these verses.
				if (!sections.some((section) => section.aboutChosenVerses)) {
					for (const section of sections) section.aboutChosenVerses = true;
				}
				const title = body.title || row.title;
				return {
					...base,
					kind: "explanation",
					reportLabel: `Explanation: ${title}`,
					sections,
					sources: sources(body.sections.map((section) => section.body)),
					title,
				};
			}
			case "original_language_note": {
				const parsed = originalLanguageNoteBodySchema.safeParse(row.body);
				if (!parsed.success) return null;
				const body = parsed.data;
				return {
					...base,
					gloss: body.gloss,
					kind: "word_meaning",
					language: body.language,
					lemma: body.lemma,
					note: { document: body.note, firstCitation: 1 },
					parsing: body.parsing,
					reportLabel: `Word meaning: ${body.word}`,
					sources: sources([body.note]),
					word: body.word,
				};
			}
			case "interpretive_question": {
				const parsed = questionBodySchema.safeParse(row.body);
				if (!parsed.success) return null;
				const body = parsed.data;
				const writings = numberWritings(
					body.views.map((view) => view.argument),
				);
				const preferredKey =
					body.stance === "preferred_view" ? body.preferredViewKey : null;
				return {
					...base,
					kind: "different_views",
					question: body.question || row.title,
					reportLabel: `Different views: ${body.question || row.title}`,
					sources: sources(body.views.map((view) => view.argument)),
					takesNoSide: preferredKey === null,
					views: body.views.map((view, index) => ({
						argument: writings[index] as StudyWriting,
						heldBy: view.heldBy.map((source) => source.label),
						key: view.key,
						name: view.name,
						preferred: view.key === preferredKey,
					})),
					whyItMatters: body.whyItMatters,
				};
			}
			case "cross_reference": {
				const parsed = crossReferenceBodySchema.safeParse(row.body);
				const ends = parseConnectionScopeKey("cross_reference", row.scopeKey);
				if (!parsed.success || !ends) return null;
				// The other end is where the link leads.
				const otherKey = isChosenEnd(parsePassageKey(ends.first))
					? ends.second
					: ends.first;
				const passage = await studyPassage(
					client,
					otherKey,
					input.translationAbbreviation,
					false,
				);
				if (!passage) return null;
				return {
					...base,
					kind: "related_verse",
					kindLabel: parsed.data.kind
						? (relatedVerseKindLabels[parsed.data.kind] ?? null)
						: null,
					note: parsed.data.note,
					passage,
					reportLabel: `Related verse: ${passage.label}`,
					sources: [],
				};
			}
			case "canonical_relationship": {
				const parsed = canonicalRelationshipBodySchema.safeParse(row.body);
				const ends = parseConnectionScopeKey(
					"canonical_relationship",
					row.scopeKey,
				);
				if (!parsed.success || !ends) return null;
				// Stored New Testament end first.
				const [newTestament, oldTestament] = await Promise.all(
					[ends.first, ends.second].map((key) =>
						studyPassage(
							client,
							key,
							input.translationAbbreviation,
							isChosenEnd(parsePassageKey(key)),
						),
					),
				);
				if (!newTestament || !oldTestament) return null;
				return {
					...base,
					kind: "testament_link",
					kindLabel: parsed.data.relationship
						? (testamentLinkKindLabels[parsed.data.relationship] ?? null)
						: null,
					newTestament,
					note: parsed.data.note,
					oldTestament,
					reportLabel: `${oldTestament.label} and ${newTestament.label}`,
					sources: [],
				};
			}
			case "textual_note": {
				const parsed = textualNoteBodySchema.safeParse(row.body);
				if (!parsed.success) return null;
				const heading = parsed.data.heading || row.title;
				return {
					...base,
					heading,
					kind: "text_note",
					note: { document: parsed.data.note, firstCitation: 1 },
					reportLabel: `About the text: ${heading}`,
					sources: sources([parsed.data.note]),
				};
			}
			case "textual_variant": {
				const parsed = textualVariantBodySchema.safeParse(row.body);
				if (!parsed.success) return null;
				const body = parsed.data;
				const location = body.location || row.title;
				return {
					...base,
					confidenceLabel: body.confidence
						? (variantConfidenceReaderLabels[body.confidence] ?? null)
						: null,
					kind: "text_variant",
					language: book?.testament === "old" ? "hebrew" : "greek",
					location,
					readings: body.readings.map((reading) => ({
						key: reading.key,
						manuscripts: reading.witnesses,
						meaning: reading.gloss,
						preferred: reading.preferred,
						text: reading.text,
					})),
					reason: { document: body.reason, firstCitation: 1 },
					reportLabel: `Where old copies differ: ${location}`,
					sources: sources([body.reason]),
				};
			}
			default:
				return null;
		}
	}

	return {
		groups: studyGroups.flatMap((group) => {
			const groupItems = items.get(group.key) ?? [];
			return groupItems.length > 0
				? [
						{
							hint: group.hint,
							items: groupItems,
							key: group.key,
							name: group.name,
						},
					]
				: [];
		}),
		reference: selectionLabel(book.name, chapter, input.verses),
	};
}

/** How many problems one member can report in a day, so the list stays workable. */
export const dailyStudyReportLimit = 20;

/**
 * A member reports a problem with a study note they read. It goes to the staff's
 * Content Issues list, against the exact revision they saw, even if a newer one
 * has been published since.
 */
export async function reportStudyProblem(
	client: DbExecutor,
	input: {
		actorUserId: string;
		description: string;
		issueType: StudyProblemType;
		revisionId: number;
	},
) {
	const [revision] = await client
		.select({ kind: contentItems.kind, status: contentRevisions.status })
		.from(contentRevisions)
		.innerJoin(
			contentItems,
			eq(contentItems.id, contentRevisions.contentItemId),
		)
		.where(eq(contentRevisions.id, input.revisionId));
	const seenByReaders =
		revision?.status === "published" ||
		revision?.status === "superseded" ||
		revision?.status === "withdrawn";
	if (
		!revision ||
		!seenByReaders ||
		!studyContentKinds.includes(revision.kind)
	) {
		throw new GovernanceError(
			"We couldn't find this note. Close it, open it again and try once more.",
		);
	}

	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const [sent] = await client
		.select({ total: count() })
		.from(contentIssues)
		.where(
			and(
				eq(contentIssues.reportedByUserId, input.actorUserId),
				gte(contentIssues.createdAt, since),
			),
		);
	if ((sent?.total ?? 0) >= dailyStudyReportLimit) {
		throw new GovernanceError(
			"You've sent a lot of reports today. Please try again tomorrow.",
		);
	}

	return raiseIssue(client, input);
}
