/*
 * The Community rules, why a member can report a post, and what a moderator can
 * decide. This file has no imports so the browser can use it too.
 */

export const communityRules = [
	{
		key: "encourage-one-another",
		title: "Encourage one another",
		description:
			"Speak with grace and humility, remembering that every person here is seeking to grow in Christ.",
	},
	{
		key: "contribute-thoughtfully",
		title: "Contribute thoughtfully",
		description:
			"Share what is helpful, truthful, and appropriate for a study-focused Christian community.",
	},
	{
		key: "keep-scripture-central",
		title: "Keep Scripture central",
		description:
			"Let Scripture guide our conversations, reflections, prayers, and testimonies.",
	},
	{
		key: "respect-privacy",
		title: "Respect privacy",
		description:
			"Do not share personal details, private conversations, or material that belongs to someone else without permission.",
	},
] as const;

export type CommunityRuleKey = (typeof communityRules)[number]["key"];

export const communityRuleKeys = communityRules.map(({ key }) => key) as [
	CommunityRuleKey,
	...CommunityRuleKey[],
];

export function communityRuleNamed(key: string | null) {
	return communityRules.find((rule) => rule.key === key) ?? null;
}

/** Each reason suggests the rule a moderator is most likely to apply. */
export const reportReasons = [
	{
		key: "personal_attack",
		label: "A personal attack or unkind words",
		rule: "encourage-one-another",
	},
	{
		key: "spam",
		label: "Spam or promotion",
		rule: "contribute-thoughtfully",
	},
	{
		key: "inappropriate",
		label: "Inappropriate content",
		rule: "contribute-thoughtfully",
	},
	{
		key: "misuses_scripture",
		label: "Misleading about Scripture",
		rule: "keep-scripture-central",
	},
	{
		key: "privacy",
		label: "Shares someone's private details",
		rule: "respect-privacy",
	},
	{ key: "other", label: "Something else", rule: null },
] as const;

export type ReportReasonKey = (typeof reportReasons)[number]["key"];

export const reportReasonKeys = reportReasons.map(({ key }) => key) as [
	ReportReasonKey,
	...ReportReasonKey[],
];

export function reportReasonNamed(key: string) {
	return reportReasons.find((reason) => reason.key === key) ?? null;
}

/** How long "Restrict posting" lasts. */
export const POSTING_RESTRICTION_DAYS = 7;

export const moderationDecisions = [
	"removed",
	"removed_and_warned",
	"restricted",
	"dismissed",
] as const;

export type ModerationDecision = (typeof moderationDecisions)[number];

export type ModerationAction = ModerationDecision | "restored";

export const moderationActionLabels: Record<ModerationAction, string> = {
	removed: "Post removed",
	removed_and_warned: "Post removed and author warned",
	restricted: `Post removed and posting restricted for ${POSTING_RESTRICTION_DAYS} days`,
	dismissed: "Report dismissed",
	restored: "Post restored",
};

export function isModerationAction(value: string): value is ModerationAction {
	return value in moderationActionLabels;
}
