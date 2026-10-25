import { Extension, type Extensions } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import {
	Table,
	TableCell,
	TableHeader,
	TableRow,
} from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";

import { BibleReference } from "./bible-reference";
import { Citation } from "./citation";
import { PassageMentions } from "./passage-mentions";
import { sanitizePastedHtml } from "./paste-sanitization";
import { SlashCommands } from "./slash-commands";
import type { RichTextEditorPreset } from "./types";
import { VerseBlock } from "./verse-block";

const allowedProtocols = new Set(["http:", "https:", "mailto:"]);

function isAllowedLinkUri(uri: string | undefined) {
	if (!uri) return false;
	try {
		return allowedProtocols.has(new URL(uri, "https://berean.study").protocol);
	} catch {
		return false;
	}
}

/**
 * Marks template headings (Observe, Interpret, Apply…) so outline tooling can
 * read them and the content styles can tint them.
 */
const SectionHeadingVariant = Extension.create({
	name: "sectionHeadingVariant",

	addGlobalAttributes() {
		return [
			{
				types: ["heading"],
				attributes: {
					variant: {
						default: null,
						parseHTML: (element) => element.getAttribute("data-variant"),
						renderHTML: (attributes) =>
							attributes.variant ? { "data-variant": attributes.variant } : {},
					},
				},
			},
		];
	},
});

/** Returns the deliberately constrained schema shared by edit and read-only use. */
export function createRichTextExtensions(
	placeholder = "Start writing…",
	preset: RichTextEditorPreset = "member",
	options: { interactive?: boolean } = {},
): Extensions {
	const { interactive = true } = options;
	return [
		StarterKit.configure({
			heading: { levels: [1, 2, 3] },
			link: {
				autolink: false,
				isAllowedUri: isAllowedLinkUri,
				linkOnPaste: false,
				openOnClick: false,
			},
		}),
		TextAlign.configure({
			alignments: ["left", "center", "right"],
			types: ["heading", "paragraph"],
		}),
		Table.configure({ renderWrapper: true, resizable: false }),
		TableRow,
		TableHeader,
		TableCell,
		Highlight,
		TaskList,
		TaskItem.configure({ nested: true }),
		SectionHeadingVariant,
		BibleReference,
		VerseBlock,
		...(preset === "contributor" ? [Citation] : []),
		...(interactive
			? [SlashCommands, PassageMentions, Placeholder.configure({ placeholder })]
			: []),
	];
}

/** Limits external paste HTML to the schema's supported vocabulary. */
export function transformPastedHtml(html: string) {
	return sanitizePastedHtml(html);
}
