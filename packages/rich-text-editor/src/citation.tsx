import { mergeAttributes, Node } from "@tiptap/core";
import {
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";

import { isValidCitation } from "./commentary-nodes";
import type { CitationAttributes } from "./document-types";

export { isValidCitation };

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		citation: {
			insertCitation: (citation: CitationAttributes) => ReturnType;
		};
	}
}

function citationTitle(citation: CitationAttributes) {
	return citation.locator
		? `${citation.label}, ${citation.locator}`
		: citation.label;
}

// The number itself comes from a CSS counter (see the content styles). It follows
// the citation's place in the text, so nothing has to be renumbered or saved when
// a citation or a whole section moves.
const CitationView = ({ node }: NodeViewProps) => {
	const citation = node.attrs as Partial<CitationAttributes>;
	const valid = isValidCitation(citation);

	return (
		<NodeViewWrapper
			as="sup"
			aria-label={valid ? `Citation: ${citationTitle(citation)}` : undefined}
			className="select-none rounded-sm bg-status-attention px-1 font-sans font-semibold text-status-attention-foreground text-xs"
			data-citation="true"
			data-excerpt-id={valid ? citation.excerptId : undefined}
			data-invalid={!valid || undefined}
			title={valid ? citationTitle(citation) : "Citation unavailable"}
		/>
	);
};

/** A numbered footnote pointing to a saved source excerpt. */
export const Citation = Node.create({
	name: "citation",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			excerptId: { default: null },
			label: { default: null },
			locator: { default: "" },
			strength: { default: "direct" },
		};
	},

	parseHTML() {
		return [
			{
				tag: 'sup[data-citation="true"]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) return false;
					const citation = {
						excerptId: Number(element.getAttribute("data-excerpt-id")),
						label: element.getAttribute("data-label") ?? "",
						locator: element.getAttribute("data-locator") ?? "",
						strength: element.getAttribute("data-strength") ?? "",
					} as CitationAttributes;
					return isValidCitation(citation) ? citation : false;
				},
			},
		];
	},

	renderHTML({ node }) {
		const citation = node.attrs as Partial<CitationAttributes>;
		if (!isValidCitation(citation)) {
			return ["sup", { "data-citation-invalid": "true" }, "[?]"];
		}
		return [
			"sup",
			mergeAttributes({
				"data-citation": "true",
				"data-excerpt-id": citation.excerptId,
				"data-label": citation.label,
				"data-locator": citation.locator,
				"data-strength": citation.strength,
				title: citationTitle(citation),
			}),
		];
	},

	addCommands() {
		return {
			insertCitation:
				(citation) =>
				({ commands }) => {
					if (!isValidCitation(citation)) return false;
					return commands.insertContent({
						attrs: citation,
						type: this.name,
					});
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(CitationView);
	},
});
