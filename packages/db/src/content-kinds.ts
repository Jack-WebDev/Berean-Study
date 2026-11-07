/*
 * The steps every piece of reviewed content moves through, and the editorial
 * checks it passes. This file has no imports so the browser can use it too.
 */

export type ContentRevisionStatus =
	| "draft"
	| "submitted"
	| "in_review"
	| "changes_requested"
	| "approved"
	| "published"
	| "superseded"
	| "withdrawn";

export const contentRevisionStatusLabels: Record<
	ContentRevisionStatus,
	string
> = {
	draft: "Draft",
	submitted: "Awaiting review",
	in_review: "In review",
	changes_requested: "Changes requested",
	approved: "Approved",
	published: "Published",
	superseded: "Replaced",
	withdrawn: "Withdrawn",
};

/** Revisions still moving towards publication. An item has at most one. */
export const openRevisionStatuses = [
	"draft",
	"submitted",
	"in_review",
	"approved",
] as const satisfies readonly ContentRevisionStatus[];

export type EditorialCheckResult = "passed" | "failed" | "not_applicable";

export const editorialCheckCatalogue = [
	{
		requirement: "Scripture references verified",
		position: 1,
		originalLanguageOnly: false,
	},
	{
		requirement: "Every claim cited",
		position: 2,
		originalLanguageOnly: false,
	},
	{
		requirement: "Original-language notes checked",
		position: 3,
		originalLanguageOnly: true,
	},
	{
		requirement: "Theological review",
		position: 4,
		originalLanguageOnly: false,
	},
	{
		requirement: "Style & readability",
		position: 5,
		originalLanguageOnly: false,
	},
] as const;

export const contentIssueTypes = [
	"factual_error",
	"citation_problem",
	"typo",
	"interpretation_concern",
	"broken_reference",
	"other",
] as const;

export type ContentIssueType = (typeof contentIssueTypes)[number];

export const contentIssueTypeLabels: Record<ContentIssueType, string> = {
	factual_error: "Factual error",
	citation_problem: "Citation problem",
	typo: "Typo",
	interpretation_concern: "Interpretation concern",
	broken_reference: "Broken reference",
	other: "Something else",
};
