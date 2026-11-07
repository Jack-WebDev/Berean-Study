import { z } from "zod";

/*
 * What sources, excerpts and claims say, and what makes each one ready for review.
 * This file has no database imports so the browser can use it in the editors.
 */

export const sourceTypes = [
	"commentary",
	"textual_commentary",
	"lexicon",
	"critical_edition",
	"article",
] as const;
export type SourceType = (typeof sourceTypes)[number];
export const sourceTypeLabels: Record<SourceType, string> = {
	commentary: "Commentary",
	textual_commentary: "Textual commentary",
	lexicon: "Lexicon",
	critical_edition: "Critical edition",
	article: "Article",
};

export const excerptForms = ["summary", "quotation"] as const;
export type ExcerptForm = (typeof excerptForms)[number];
export const excerptFormLabels: Record<ExcerptForm, string> = {
	quotation: "Short quotation",
	summary: "Summary in our words",
};

export const citationStrengths = ["direct", "partial", "background"] as const;
export type CitationStrength = (typeof citationStrengths)[number];
export const citationStrengthLabels: Record<CitationStrength, string> = {
	direct: "Directly supports",
	partial: "Partly supports",
	background: "Background",
};

export const claimKinds = [
	"textual",
	"historical",
	"linguistic",
	"interpretive",
] as const;
export type ClaimKind = (typeof claimKinds)[number];
export const claimKindLabels: Record<ClaimKind, string> = {
	textual: "Textual",
	historical: "Historical",
	linguistic: "Linguistic",
	interpretive: "Interpretive",
};

export const claimConfidences = [
	"well_established",
	"probable",
	"debated",
] as const;
export type ClaimConfidence = (typeof claimConfidences)[number];
export const claimConfidenceLabels: Record<ClaimConfidence, string> = {
	well_established: "Well established",
	probable: "Probable",
	debated: "Debated",
};

/** Longer material has to be summarised in our own words. The owner set this number. */
export const MAX_QUOTATION_WORDS = 75;

export const sourceBodySchema = z.object({
	type: z.enum(sourceTypes).nullable(),
	authors: z.string().trim().max(300),
	edition: z.string().trim().max(100),
	title: z.string().trim().max(300),
	publisher: z.string().trim().max(200),
	year: z.string().trim().max(20),
});
export type SourceBody = z.infer<typeof sourceBodySchema>;
export const emptySourceBody: SourceBody = {
	type: null,
	authors: "",
	edition: "",
	title: "",
	publisher: "",
	year: "",
};

export const excerptBodySchema = z.object({
	location: z.string().trim().max(200),
	form: z.enum(excerptForms),
	text: z.string().trim().max(5000),
	passages: z.array(z.string().trim().min(1).max(100)).max(20),
});
export type ExcerptBody = z.infer<typeof excerptBodySchema>;
export const emptyExcerptBody: ExcerptBody = {
	location: "",
	form: "summary",
	text: "",
	passages: [],
};

export const claimCitationSchema = z.object({
	excerptId: z.number().int().positive(),
	locator: z.string().trim().max(200),
	strength: z.enum(citationStrengths),
});
export type ClaimCitation = z.infer<typeof claimCitationSchema>;

export const claimBodySchema = z.object({
	statement: z.string().trim().max(1000),
	passage: z.string().trim().max(100),
	kind: z.enum(claimKinds).nullable(),
	confidence: z.enum(claimConfidences).nullable(),
	citations: z.array(claimCitationSchema).max(50),
});
export type ClaimBody = z.infer<typeof claimBodySchema>;
export const emptyClaimBody: ClaimBody = {
	statement: "",
	passage: "",
	kind: null,
	confidence: null,
	citations: [],
};

export function countWords(text: string) {
	const trimmed = text.trim();
	return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** How a source is named everywhere it's listed. */
export function sourceLabel({
	edition,
	title,
}: Pick<SourceBody, "edition" | "title">) {
	const name = title || "Untitled source";
	return edition ? `${name} (${edition})` : name;
}

/** Everything that would stop this source going to review. Empty means ready. */
export function sourceProblems(body: SourceBody) {
	const problems: string[] = [];
	if (!body.type) problems.push("Choose what type of source this is.");
	if (!body.title) problems.push("Add the source's title.");
	if (!body.authors) problems.push("Add the author or authors.");
	if (body.year && !/^\d{3,4}$/.test(body.year)) {
		problems.push("Write the year as a number, such as 1994.");
	}
	return problems;
}

/** Everything that would stop this excerpt going to review. Empty means ready. */
export function excerptProblems(body: ExcerptBody) {
	const problems: string[] = [];
	if (!body.location) problems.push("Say where in the source this comes from.");
	if (!body.text) {
		problems.push(
			body.form === "quotation"
				? "Add the quotation."
				: "Add the summary in our own words.",
		);
	}
	if (
		body.form === "quotation" &&
		countWords(body.text) > MAX_QUOTATION_WORDS
	) {
		problems.push(
			`Quotations can be at most ${MAX_QUOTATION_WORDS} words. Shorten this one, or summarise it in our own words.`,
		);
	}
	return problems;
}

/** Everything that would stop this claim going to review. Empty means ready. */
export function claimProblems(body: ClaimBody) {
	const problems: string[] = [];
	if (!body.statement) problems.push("Write the claim's statement.");
	if (!body.passage) problems.push("Add the passage this claim is about.");
	if (!body.kind) problems.push("Choose what kind of claim this is.");
	if (!body.confidence) problems.push("Choose how confident we are.");
	if (body.citations.length === 0) {
		problems.push(
			"Add at least one citation. Every claim has to trace back to a source.",
		);
	}
	return problems;
}

export function sourceFields(body: SourceBody) {
	return [
		{ label: "Type", text: body.type ? sourceTypeLabels[body.type] : "" },
		{ label: "Author(s)", text: body.authors },
		{ label: "Title", text: body.title },
		{ label: "Edition", text: body.edition },
		{ label: "Publisher", text: body.publisher },
		{ label: "Year", text: body.year },
	];
}

export function excerptFields(body: ExcerptBody) {
	return [
		{ label: "Location", text: body.location },
		{ label: "Form", text: excerptFormLabels[body.form] },
		{ label: excerptFormLabels[body.form], text: body.text },
		{ label: "Passages", text: body.passages.join("; ") },
	];
}

export function claimFields(body: ClaimBody) {
	return [
		{ label: "Statement", text: body.statement },
		{ label: "Passage", text: body.passage },
		{ label: "Kind", text: body.kind ? claimKindLabels[body.kind] : "" },
		{
			label: "Confidence",
			text: body.confidence ? claimConfidenceLabels[body.confidence] : "",
		},
		{
			label: "Citations",
			text: body.citations
				.map(
					({ excerptId, locator, strength }) =>
						`Excerpt ${excerptId}${locator ? ` (${locator})` : ""}: ${citationStrengthLabels[strength]}`,
				)
				.join("\n"),
		},
	];
}

// Small words say little about whether two titles are the same book.
const titleNoise = new Set(["a", "an", "and", "of", "on", "the", "to"]);

function titleWords(title: string) {
	return new Set(
		title
			.toLowerCase()
			.replace(/[^\p{L}\p{N}\s]/gu, " ")
			.split(/\s+/)
			.filter((word) => word && !titleNoise.has(word)),
	);
}

/**
 * Whether two titles are probably the same work, perhaps in another edition. Used
 * to warn, never to block, so it can afford to be a little generous.
 */
export function titlesLookAlike(first: string, second: string) {
	const a = titleWords(first);
	const b = titleWords(second);
	if (a.size === 0 || b.size === 0) return false;
	const shared = [...a].filter((word) => b.has(word)).length;
	return shared / Math.max(a.size, b.size) >= 0.6;
}
