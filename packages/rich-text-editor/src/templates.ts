import type { RichTextDocument, RichTextNode } from "./document-types";

/** A heading for the writer to respond to, with a hint in the empty line below. */
export type TemplateSection = { heading: string; prompt: string };

export const testimonyTemplateSections: readonly TemplateSection[] = [
	{
		heading: "What happened?",
		prompt: "Describe the situation in a few sentences…",
	},
	{ heading: "What did you learn?", prompt: "About God, yourself, or others…" },
	{
		heading: "Where did you see His faithfulness?",
		prompt: "The moment you knew God was in it…",
	},
];

/** A testimony starts as three questions, each followed by an empty line. */
export function createTestimonyTemplate(
	sections: readonly TemplateSection[] = testimonyTemplateSections,
): RichTextDocument {
	return {
		content: sections.flatMap((section) => createTemplateSection(section)),
		type: "doc",
	};
}

/** A reflection starts with the chosen guiding question as its heading. */
export function createReflectionTemplate(question: string): RichTextDocument {
	return {
		content: createTemplateSection({
			heading: question,
			prompt: "Keep writing…",
		}),
		type: "doc",
	};
}

/**
 * A heading plus an empty paragraph. The paragraph's `prompt` is a hint the
 * editor shows while the line is empty; it is never part of the text.
 */
export function createTemplateSection({
	heading,
	prompt,
}: TemplateSection): RichTextNode[] {
	return [
		{
			attrs: { level: 2 },
			content: [{ text: heading, type: "text" }],
			type: "heading",
		},
		{ attrs: { prompt }, type: "paragraph" },
	];
}
