import {
	getCommentaryReviewText,
	getDocumentCommentaryNodes,
	hasRichTextContent,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { z } from "zod";

import { type ChecklistItem, richTextBody } from "./commentary-body";

/*
 * What original-language notes, textual notes and textual variants say. Words are
 * typed for now. This file has no database imports so the browser can run the same
 * checks as the server.
 */

export const noteLanguages = ["greek", "hebrew"] as const;
export type NoteLanguage = (typeof noteLanguages)[number];
export const noteLanguageLabels: Record<NoteLanguage, string> = {
	greek: "Greek",
	hebrew: "Hebrew",
};

export const variantKinds = ["addition", "substitution", "word_order"] as const;
export type VariantKind = (typeof variantKinds)[number];
export const variantKindLabels: Record<VariantKind, string> = {
	addition: "Addition / omission",
	substitution: "Substitution",
	word_order: "Word order",
};

export const variantConfidences = ["certain", "probable", "uncertain"] as const;
export type VariantConfidence = (typeof variantConfidences)[number];
export const variantConfidenceLabels: Record<VariantConfidence, string> = {
	certain: "Certain",
	probable: "Probable",
	uncertain: "Uncertain",
};

const passage = z.string().trim().max(100);

const blankDocument: RichTextDocument = {
	content: [{ type: "paragraph" }],
	type: "doc",
};

export const originalLanguageNoteBodySchema = z.object({
	passage,
	language: z.enum(noteLanguages),
	word: z.string().trim().max(100),
	lemma: z.string().trim().max(100),
	parsing: z.string().trim().max(200),
	lexiconKey: z.string().trim().max(50),
	gloss: z.string().trim().max(200),
	note: richTextBody,
});
export type OriginalLanguageNoteBody = z.infer<
	typeof originalLanguageNoteBodySchema
>;
export const emptyOriginalLanguageNoteBody: OriginalLanguageNoteBody = {
	gloss: "",
	language: "greek",
	lemma: "",
	lexiconKey: "",
	note: blankDocument,
	parsing: "",
	passage: "",
	word: "",
};

export const textualNoteBodySchema = z.object({
	passage,
	heading: z.string().trim().max(200),
	note: richTextBody,
	/** The variant this explains, by its scope key. */
	relatedVariant: z
		.object({
			scopeKey: z.string().min(1).max(64),
			label: z.string().trim().min(1).max(300),
		})
		.nullable(),
});
export type TextualNoteBody = z.infer<typeof textualNoteBodySchema>;
export const emptyTextualNoteBody: TextualNoteBody = {
	heading: "",
	note: blankDocument,
	passage: "",
	relatedVariant: null,
};

export const textualVariantBodySchema = z.object({
	passage,
	location: z.string().trim().max(200),
	kind: z.enum(variantKinds).nullable(),
	readings: z
		.array(
			z.object({
				key: z.string().min(1).max(64),
				text: z.string().trim().max(500),
				gloss: z.string().trim().max(500),
				witnesses: z.array(z.string().trim().min(1).max(60)).max(60),
				preferred: z.boolean(),
			}),
		)
		.max(20),
	reason: richTextBody,
	confidence: z.enum(variantConfidences).nullable(),
});
export type TextualVariantBody = z.infer<typeof textualVariantBodySchema>;
export type VariantReading = TextualVariantBody["readings"][number];
export const emptyTextualVariantBody: TextualVariantBody = {
	confidence: null,
	kind: null,
	location: "",
	passage: "",
	readings: [],
	reason: blankDocument,
};

export function newVariantReading(key: string): VariantReading {
	return { gloss: "", key, preferred: false, text: "", witnesses: [] };
}

const citationsWarning = (document: RichTextDocument): ChecklistItem => {
	const { citations } = getDocumentCommentaryNodes(document);
	return {
		blocking: false,
		ok: citations.length > 0,
		text: citations.length > 0 ? "Has a citation" : "No citations yet",
	};
};

export function originalLanguageNoteChecklist(
	body: OriginalLanguageNoteBody,
): ChecklistItem[] {
	return [
		{ blocking: true, ok: Boolean(body.passage), text: "Names a passage" },
		{ blocking: true, ok: Boolean(body.word), text: "Gives the word" },
		{ blocking: true, ok: Boolean(body.gloss), text: "Gives a short gloss" },
		{
			blocking: true,
			ok: hasRichTextContent(body.note),
			text: "Has a note",
		},
		{
			blocking: false,
			ok: Boolean(body.lemma && body.parsing),
			text:
				body.lemma && body.parsing
					? "Has lemma and parsing"
					: "Lemma or parsing is missing",
		},
		citationsWarning(body.note),
	];
}

export function textualNoteChecklist(body: TextualNoteBody): ChecklistItem[] {
	return [
		{ blocking: true, ok: Boolean(body.passage), text: "Names a passage" },
		{ blocking: true, ok: Boolean(body.heading), text: "Has a heading" },
		{
			blocking: true,
			ok: hasRichTextContent(body.note),
			text: "Has a note for readers",
		},
		citationsWarning(body.note),
	];
}

export function textualVariantChecklist(
	body: TextualVariantBody,
): ChecklistItem[] {
	const noWitness = body.readings.filter(
		({ witnesses }) => witnesses.length === 0,
	);
	return [
		{ blocking: true, ok: Boolean(body.passage), text: "Names a passage" },
		{ blocking: true, ok: Boolean(body.location), text: "Says where it is" },
		{ blocking: true, ok: body.kind !== null, text: "Says what kind it is" },
		{
			blocking: true,
			ok: body.readings.length >= 2 && body.readings.every(({ text }) => text),
			text: "Has at least two readings, each with its text",
		},
		{
			blocking: true,
			ok: body.readings.filter(({ preferred }) => preferred).length === 1,
			text: "Marks one reading as preferred",
		},
		{
			blocking: true,
			ok: hasRichTextContent(body.reason),
			text: "Says why that reading is preferred",
		},
		{
			blocking: true,
			ok: body.confidence !== null,
			text: "Gives a confidence",
		},
		{
			blocking: false,
			ok: noWitness.length === 0,
			text:
				noWitness.length === 0
					? "Every reading lists a witness"
					: `${noWitness.length} ${noWitness.length === 1 ? "reading has" : "readings have"} no witnesses`,
		},
		citationsWarning(body.reason),
	];
}

export function originalLanguageNoteFields(body: OriginalLanguageNoteBody) {
	return [
		{ label: "Passage", text: body.passage },
		{ label: "Language", text: noteLanguageLabels[body.language] },
		{ label: "Word", text: body.word },
		{ label: "Lemma", text: body.lemma },
		{ label: "Parsing", text: body.parsing },
		{ label: "Lexicon key", text: body.lexiconKey },
		{ label: "Short gloss", text: body.gloss },
		{ label: "Note", text: getCommentaryReviewText(body.note) },
	];
}

export function textualNoteFields(body: TextualNoteBody) {
	return [
		{ label: "Passage", text: body.passage },
		{ label: "Heading", text: body.heading },
		{ label: "Note for readers", text: getCommentaryReviewText(body.note) },
		{ label: "Related variant", text: body.relatedVariant?.label ?? "" },
	];
}

export function textualVariantFields(body: TextualVariantBody) {
	return [
		{ label: "Passage", text: body.passage },
		{ label: "Location", text: body.location },
		{
			label: "Kind",
			text: body.kind ? variantKindLabels[body.kind] : "",
		},
		{
			label: "Readings",
			text: body.readings
				.map(
					({ gloss, preferred, text, witnesses }) =>
						`${preferred ? "Preferred: " : ""}${text}${gloss ? ` (${gloss})` : ""}${witnesses.length > 0 ? ` [${witnesses.join(", ")}]` : ""}`,
				)
				.join("\n"),
		},
		{
			label: "Why this reading is preferred",
			text: getCommentaryReviewText(body.reason),
		},
		{
			label: "Confidence",
			text: body.confidence ? variantConfidenceLabels[body.confidence] : "",
		},
	];
}
