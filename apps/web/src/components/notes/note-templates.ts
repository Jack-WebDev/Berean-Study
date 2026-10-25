import type {
	EditorSection,
	SectionVariant,
} from "@berean-study/rich-text-editor";

export type NoteTemplate = {
	description: string;
	id: "inductive" | "sermon" | "soap";
	/** Short labels previewed on the template card. */
	labels: ReadonlyArray<{ text: string; variant: SectionVariant }>;
	name: string;
	sections: readonly EditorSection[];
};

/** Study structures offered while a new note is still empty. */
export const noteTemplates: readonly NoteTemplate[] = [
	{
		description:
			"What the text says, what it means, and how you’ll live it out.",
		id: "inductive",
		labels: [
			{ text: "Observe", variant: "observe" },
			{ text: "Interpret", variant: "interpret" },
			{ text: "Apply", variant: "apply" },
		],
		name: "Inductive study",
		sections: [
			{ text: "Observe", variant: "observe" },
			{ text: "Interpret", variant: "interpret" },
			{ text: "Apply", variant: "apply" },
		],
	},
	{
		description:
			"Scripture, Observation, Application and Prayer — a daily devotional rhythm.",
		id: "soap",
		labels: ["S", "O", "A", "P"].map((text) => ({
			text,
			variant: "section" as const,
		})),
		name: "SOAP journal",
		sections: [
			{ text: "Scripture", variant: "section" },
			{ text: "Observation", variant: "observe" },
			{ text: "Application", variant: "apply" },
			{ text: "Prayer", variant: "section" },
		],
	},
	{
		description: "Main points, cross-references and takeaways from a message.",
		id: "sermon",
		labels: ["1", "2", "3"].map((text) => ({
			text,
			variant: "section" as const,
		})),
		name: "Sermon notes",
		sections: [
			{ text: "Main points", variant: "section" },
			{ text: "Cross-references", variant: "section" },
			{ text: "Takeaways", variant: "section" },
		],
	},
];

/** Tailwind classes for each section tone, shared by labels and outline dots. */
export const sectionToneClassName: Record<
	SectionVariant,
	{ dot: string; label: string }
> = {
	apply: {
		dot: "bg-section-apply-foreground",
		label: "bg-section-apply text-section-apply-foreground",
	},
	interpret: {
		dot: "bg-scripture-accent",
		label: "bg-scripture text-scripture-foreground",
	},
	observe: {
		dot: "bg-primary",
		label: "bg-section-observe text-section-observe-foreground",
	},
	section: {
		dot: "bg-muted-foreground",
		label: "bg-secondary text-secondary-foreground",
	},
};
