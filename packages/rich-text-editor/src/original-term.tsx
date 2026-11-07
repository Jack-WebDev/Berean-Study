import { mergeAttributes, Node } from "@tiptap/core";
import {
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";

import { isValidOriginalTerm } from "./commentary-nodes";
import type { OriginalTermAttributes } from "./document-types";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		originalTerm: {
			insertOriginalTerm: (term: OriginalTermAttributes) => ReturnType;
		};
	}
}

const languageCodes = { greek: "grc", hebrew: "he" } as const;

function OriginalTermView({ node }: NodeViewProps) {
	const term = node.attrs as Partial<OriginalTermAttributes>;
	if (!isValidOriginalTerm(term)) {
		return <NodeViewWrapper as="span">Word unavailable</NodeViewWrapper>;
	}
	return (
		<NodeViewWrapper
			as="em"
			className="select-none underline decoration-sidebar-primary decoration-dotted underline-offset-4"
			data-original-term="true"
			dir={term.language === "hebrew" ? "rtl" : undefined}
			lang={languageCodes[term.language]}
			title={term.gloss || undefined}
		>
			{term.word}
		</NodeViewWrapper>
	);
}

/** A Greek or Hebrew word in contributor writing, typed by the writer. */
export const OriginalTerm = Node.create({
	name: "originalTerm",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			gloss: { default: "" },
			language: { default: "greek" },
			word: { default: null },
		};
	},

	parseHTML() {
		return [
			{
				tag: 'em[data-original-term="true"]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) return false;
					const term = {
						gloss: element.getAttribute("title") ?? "",
						language:
							element.getAttribute("lang") === "he" ? "hebrew" : "greek",
						word: element.textContent ?? "",
					} as OriginalTermAttributes;
					return isValidOriginalTerm(term) ? term : false;
				},
			},
		];
	},

	renderHTML({ node }) {
		const term = node.attrs as Partial<OriginalTermAttributes>;
		if (!isValidOriginalTerm(term)) return ["span", {}, "Word unavailable"];
		return [
			"em",
			mergeAttributes({
				"data-original-term": "true",
				lang: languageCodes[term.language],
				title: term.gloss,
			}),
			term.word,
		];
	},

	addCommands() {
		return {
			insertOriginalTerm:
				(term) =>
				({ commands }) => {
					if (!isValidOriginalTerm(term)) return false;
					return commands.insertContent({ attrs: term, type: this.name });
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(OriginalTermView);
	},
});
