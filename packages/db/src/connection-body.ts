import { z } from "zod";

import type { ChecklistItem } from "./commentary-body";

/*
 * What cross-references and canonical relationships say. Each one's two passages
 * are its identity, kept in its scope key, so they never change. This file has no
 * database imports so the browser can run the same checks as the server.
 */

export const crossReferenceKinds = [
	"parallel",
	"same_word",
	"contrast",
	"illustration",
] as const;
export type CrossReferenceKind = (typeof crossReferenceKinds)[number];
export const crossReferenceKindLabels: Record<CrossReferenceKind, string> = {
	parallel: "Parallel thought",
	same_word: "Same word",
	contrast: "Contrast",
	illustration: "Illustration",
};

export const canonicalRelationshipTypes = [
	"quotation",
	"allusion",
	"echo",
	"typology",
	"fulfilment",
] as const;
export type CanonicalRelationshipType =
	(typeof canonicalRelationshipTypes)[number];
export const canonicalRelationshipLabels: Record<
	CanonicalRelationshipType,
	string
> = {
	quotation: "Quotation",
	allusion: "Allusion",
	echo: "Echo",
	typology: "Typology",
	fulfilment: "Fulfilment",
};

export const textForms = ["septuagint", "hebrew", "unclear"] as const;
export type TextForm = (typeof textForms)[number];
export const textFormLabels: Record<TextForm, string> = {
	septuagint: "Septuagint",
	hebrew: "Hebrew (Masoretic)",
	unclear: "Unclear / mixed",
};

const note = z.string().trim().max(2000);

export const crossReferenceBodySchema = z.object({
	kind: z.enum(crossReferenceKinds).nullable(),
	/** Readers also see this link on the passage it points to. */
	twoWay: z.boolean(),
	note,
});
export type CrossReferenceBody = z.infer<typeof crossReferenceBodySchema>;
export const emptyCrossReferenceBody: CrossReferenceBody = {
	kind: null,
	note: "",
	twoWay: false,
};

export const canonicalRelationshipBodySchema = z.object({
	relationship: z.enum(canonicalRelationshipTypes).nullable(),
	textForm: z.enum(textForms).nullable(),
	note,
});
export type CanonicalRelationshipBody = z.infer<
	typeof canonicalRelationshipBodySchema
>;
export const emptyCanonicalRelationshipBody: CanonicalRelationshipBody = {
	note: "",
	relationship: null,
	textForm: null,
};

export function crossReferenceChecklist(
	body: CrossReferenceBody,
): ChecklistItem[] {
	return [
		{ blocking: true, ok: body.kind !== null, text: "Choose the kind of link" },
		{ blocking: true, ok: Boolean(body.note), text: "Add a note for readers" },
	];
}

export function canonicalRelationshipChecklist(
	body: CanonicalRelationshipBody,
): ChecklistItem[] {
	return [
		{
			blocking: true,
			ok: body.relationship !== null,
			text: "Choose the relationship",
		},
		{
			blocking: true,
			ok: body.textForm !== null,
			text: "Say which text form is used",
		},
		{ blocking: true, ok: Boolean(body.note), text: "Add a note for readers" },
	];
}

export function crossReferenceFields(body: CrossReferenceBody) {
	return [
		{
			label: "Kind of link",
			text: body.kind ? crossReferenceKindLabels[body.kind] : "",
		},
		{
			label: "Direction",
			text: body.twoWay ? "Shown on both passages" : "Shown on the first only",
		},
		{ label: "Note for readers", text: body.note },
	];
}

export function canonicalRelationshipFields(body: CanonicalRelationshipBody) {
	return [
		{
			label: "Relationship",
			text: body.relationship
				? canonicalRelationshipLabels[body.relationship]
				: "",
		},
		{
			label: "Text form used",
			text: body.textForm ? textFormLabels[body.textForm] : "",
		},
		{ label: "Note", text: body.note },
	];
}

/** The two passages of a connection, in the order its kind reads them. */
export function connectionScopeKey(
	kind: "canonical_relationship" | "cross_reference",
	first: string,
	second: string,
) {
	return kind === "cross_reference"
		? `${first}>${second}`
		: `${first}<${second}`;
}

export function parseConnectionScopeKey(
	kind: "canonical_relationship" | "cross_reference",
	key: string,
) {
	const [first, second, ...rest] = key.split(
		kind === "cross_reference" ? ">" : "<",
	);
	return first && second && rest.length === 0 ? { first, second } : null;
}
