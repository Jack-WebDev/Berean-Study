import {
	getCommentaryReviewText,
	getDocumentCommentaryNodes,
	hasRichTextContent,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { z } from "zod";

import { type ChecklistItem, richTextBody } from "./commentary-body";
import { splitScriptureReference } from "./passage-key";

/*
 * What interpretive questions and themes say, and what makes each ready for review.
 * This file has no database imports so the browser can run the same checks.
 */

export const questionStances = ["no_position", "preferred_view"] as const;
export type QuestionStance = (typeof questionStances)[number];
export const questionStanceLabels: Record<QuestionStance, string> = {
	no_position: "Present views fairly, with no position",
	preferred_view: "Present views, and note a preferred view",
};

const sourceChip = z.object({
	sourceId: z.number().int().positive(),
	label: z.string().trim().min(1).max(300),
});

export const questionBodySchema = z.object({
	passage: z.string().trim().max(100),
	stance: z.enum(questionStances),
	preferredViewKey: z.string().max(64).nullable(),
	question: z.string().trim().max(500),
	whyItMatters: z.string().trim().max(2000),
	views: z
		.array(
			z.object({
				/** Stays the same through renames and moves, so the editor can follow a view. */
				key: z.string().min(1).max(64),
				name: z.string().trim().max(200),
				argument: richTextBody,
				heldBy: z.array(sourceChip).max(30),
			}),
		)
		.max(20),
});
export type QuestionBody = z.infer<typeof questionBodySchema>;
export type QuestionView = QuestionBody["views"][number];

export const emptyQuestionBody: QuestionBody = {
	passage: "",
	preferredViewKey: null,
	question: "",
	stance: "no_position",
	views: [],
	whyItMatters: "",
};

const blankDocument: RichTextDocument = {
	content: [{ type: "paragraph" }],
	type: "doc",
};

export function newQuestionView(key: string): QuestionView {
	return { argument: blankDocument, heldBy: [], key, name: "" };
}

/** A label readers can follow: views are A, B, C in the order they're shown. */
export function viewLetter(index: number) {
	return String.fromCharCode(65 + index);
}

/** Every piece of writing in a question, in the order readers meet it. */
export function questionDocuments(body: QuestionBody) {
	return body.views.map(({ argument }) => argument);
}

/** The Fairness check. Only unfinished work blocks. The reviewer judges the rest. */
export function questionChecklist(body: QuestionBody): ChecklistItem[] {
	const named = body.views.map((view, index) => ({
		...view,
		display: view.name || `View ${viewLetter(index)}`,
	}));
	const noSource = named.filter(({ heldBy }) => heldBy.length === 0);
	const noCitation = named.filter(
		({ argument }) =>
			getDocumentCommentaryNodes(argument).citations.length === 0,
	);
	const names = (views: readonly { display: string }[]) =>
		views.map(({ display }) => display).join(", ");

	const items: ChecklistItem[] = [
		{ blocking: true, ok: Boolean(body.passage), text: "Names a passage" },
		{ blocking: true, ok: Boolean(body.question), text: "Asks the question" },
		{
			blocking: true,
			ok: body.views.length >= 2,
			text: "Gives at least two views",
		},
		{
			blocking: true,
			ok:
				body.views.length > 0 &&
				body.views.every(
					({ argument, name }) => name && hasRichTextContent(argument),
				),
			text: "Every view has a name and an argument",
		},
	];
	if (body.stance === "preferred_view") {
		items.push({
			blocking: true,
			ok: body.views.some(({ key }) => key === body.preferredViewKey),
			text: "Says which view is preferred",
		});
	}
	items.push(
		{
			blocking: false,
			ok: Boolean(body.whyItMatters),
			text: body.whyItMatters
				? "Says why it matters"
				: "Doesn't say why it matters yet",
		},
		{
			blocking: false,
			ok: noSource.length === 0,
			text:
				noSource.length === 0
					? "Every view names a source"
					: `No source named for ${names(noSource)}`,
		},
		{
			blocking: false,
			ok: noCitation.length === 0,
			text:
				noCitation.length === 0
					? "Every view has a citation"
					: `No citations for ${names(noCitation)}`,
		},
	);
	return items;
}

export function questionFields(body: QuestionBody) {
	const preferred = body.views.find(({ key }) => key === body.preferredViewKey);
	return [
		{ label: "Passage", text: body.passage },
		{
			label: "Berean Study's stance",
			text:
				body.stance === "preferred_view"
					? `${questionStanceLabels.preferred_view}: ${preferred?.name || "not chosen"}`
					: questionStanceLabels.no_position,
		},
		{ label: "Question", text: body.question },
		{ label: "Why it matters", text: body.whyItMatters },
		{
			label: "Views, in reading order",
			text: body.views
				.map(
					({ name }, index) =>
						`${viewLetter(index)}. ${name || "Untitled view"}`,
				)
				.join("\n"),
		},
		...body.views.map(({ argument, heldBy, name }, index) => ({
			label: `View ${viewLetter(index)}: ${name || "Untitled view"}`,
			text: [
				getCommentaryReviewText(argument),
				heldBy.length > 0
					? `Held by: ${heldBy.map(({ label }) => label).join("; ")}`
					: "",
			]
				.filter(Boolean)
				.join("\n"),
		})),
	];
}

/** What readers take the stance to be. A different preferred view is a different stance. */
function stanceOf(body: QuestionBody) {
	return body.stance === "preferred_view"
		? (body.views.find(({ key }) => key === body.preferredViewKey)?.key ?? null)
		: "no_position";
}

export function questionStanceChange(
	before: QuestionBody,
	after: QuestionBody,
) {
	if (stanceOf(before) === stanceOf(after)) return null;
	const words = (body: QuestionBody) =>
		body.stance === "preferred_view"
			? `preferring "${body.views.find(({ key }) => key === body.preferredViewKey)?.name ?? "a view"}"`
			: "taking no position";
	return `This changes Berean Study's stance from ${words(before)} to ${words(after)}.`;
}

export const themePassageRoles = [
	"key_text",
	"supporting",
	"narrative_example",
] as const;
export type ThemePassageRole = (typeof themePassageRoles)[number];
export const themePassageRoleLabels: Record<ThemePassageRole, string> = {
	key_text: "Key text",
	supporting: "Supporting",
	narrative_example: "Narrative example",
};

export const themeOrders = ["canonical", "custom"] as const;
export type ThemeOrder = (typeof themeOrders)[number];
export const themeOrderLabels: Record<ThemeOrder, string> = {
	canonical: "Canonical order",
	custom: "Custom order",
};

export const themeBodySchema = z.object({
	name: z.string().trim().max(100),
	relatedThemes: z
		.array(
			z.object({
				themeId: z.number().int().positive(),
				name: z.string().trim().min(1).max(100),
			}),
		)
		.max(20),
	summary: z.string().trim().max(300),
	description: richTextBody,
	order: z.enum(themeOrders),
	passages: z
		.array(
			z.object({
				key: z.string().min(1).max(64),
				reference: z.string().trim().min(1).max(100),
				why: z.string().trim().max(500),
				role: z.enum(themePassageRoles),
			}),
		)
		.max(300),
});
export type ThemeBody = z.infer<typeof themeBodySchema>;
export type ThemePassage = ThemeBody["passages"][number];

export const emptyThemeBody: ThemeBody = {
	description: blankDocument,
	name: "",
	order: "canonical",
	passages: [],
	relatedThemes: [],
	summary: "",
};

export function themeDocuments(body: ThemeBody) {
	return [body.description];
}

export function themeChecklist(body: ThemeBody): ChecklistItem[] {
	const noReason = body.passages.filter(({ why }) => !why);
	const keyTexts = body.passages.filter(({ role }) => role === "key_text");
	return [
		{ blocking: true, ok: Boolean(body.name), text: "Has a name" },
		{
			blocking: true,
			ok: Boolean(body.summary),
			text: "Has a summary for its card",
		},
		{
			blocking: true,
			ok: body.passages.length > 0,
			text: "Lists at least one passage",
		},
		{
			blocking: false,
			ok: hasRichTextContent(body.description),
			text: hasRichTextContent(body.description)
				? "Has a description"
				: "No description yet",
		},
		{
			blocking: false,
			ok: keyTexts.length > 0,
			text: keyTexts.length > 0 ? "Has a key text" : "No key text marked yet",
		},
		{
			blocking: false,
			ok: noReason.length === 0,
			text:
				noReason.length === 0
					? "Every passage says why it belongs"
					: `No reason given for ${noReason.map(({ reference }) => reference).join(", ")}`,
		},
	];
}

/** The order readers see. `bookPositions` is each book's place in the canon, by name. */
export function orderedThemePassages(
	body: Pick<ThemeBody, "order" | "passages">,
	bookPositions: Readonly<Record<string, number>>,
) {
	if (body.order === "custom") return body.passages;
	const place = ({ reference }: ThemePassage) => {
		const split = splitScriptureReference(reference);
		const name = split?.bookText ?? "";
		return {
			book: bookPositions[name === "Psalm" ? "Psalms" : name] ?? 9999,
			chapter: split?.range?.from.chapter ?? 0,
			verse: split?.range?.from.verse ?? 0,
		};
	};
	return [...body.passages].sort((first, second) => {
		const a = place(first);
		const b = place(second);
		return a.book - b.book || a.chapter - b.chapter || a.verse - b.verse;
	});
}

export function themeFields(body: ThemeBody) {
	return [
		{ label: "Name", text: body.name },
		{
			label: "Related themes",
			text: body.relatedThemes.map(({ name }) => name).join(", "),
		},
		{ label: "Summary", text: body.summary },
		{ label: "Description", text: getCommentaryReviewText(body.description) },
		{ label: "Passage order", text: themeOrderLabels[body.order] },
		{
			label: "Theme passages",
			text: body.passages
				.map(
					({ reference, role, why }) =>
						`${reference} (${themePassageRoleLabels[role]})${why ? `: ${why}` : ""}`,
				)
				.join("\n"),
		},
	];
}

export function themeRename(before: ThemeBody, after: ThemeBody) {
	if (before.name === after.name) return null;
	return `This renames the published theme "${before.name}" to "${after.name}".`;
}
