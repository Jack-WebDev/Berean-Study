import { mergeAttributes, Node } from "@tiptap/core";
import {
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";

import type { CitationAttributes } from "./types";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		citation: {
			insertCitation: (citation: CitationAttributes) => ReturnType;
		};
	}
}

export function isValidCitation(
	citation: Partial<CitationAttributes> | null | undefined,
): citation is CitationAttributes {
	const citationId = citation?.citationId;
	const label = citation?.label;
	return Boolean(
		citation &&
			Number.isInteger(citationId) &&
			typeof citationId === "number" &&
			citationId > 0 &&
			typeof label === "string" &&
			label.trim(),
	);
}

const CitationView = ({ node }: NodeViewProps) => {
	const citation = node.attrs as Partial<CitationAttributes>;
	const label = isValidCitation(citation) ? citation.label : "?";

	return (
		<NodeViewWrapper
			as="sup"
			className="cursor-pointer select-none rounded-sm px-0.5 font-medium font-sans text-primary text-xs"
			data-citation="true"
			data-citation-id={
				isValidCitation(citation) ? citation.citationId : undefined
			}
			data-invalid={!isValidCitation(citation) || undefined}
			title={
				isValidCitation(citation) ? `Citation ${label}` : "Citation unavailable"
			}
		>
			[{label}]
		</NodeViewWrapper>
	);
};

/** A structured, selectable inline citation owned by the host application. */
export const Citation = Node.create({
	name: "citation",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			citationId: { default: null },
			label: { default: null },
		};
	},

	parseHTML() {
		return [
			{
				tag: 'sup[data-citation="true"]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) return false;
					const citation = {
						citationId: Number(element.getAttribute("data-citation-id")),
						label:
							element.getAttribute("data-label") ??
							element.textContent?.replace(/^\[|\]$/g, "") ??
							"",
					};
					return isValidCitation(citation) ? citation : false;
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		const citation = HTMLAttributes as Partial<CitationAttributes>;
		if (!isValidCitation(citation)) {
			return ["sup", { "data-citation-invalid": "true" }, "[?]"];
		}
		return [
			"sup",
			mergeAttributes(HTMLAttributes, {
				"data-citation": "true",
				"data-citation-id": citation.citationId,
				"data-label": citation.label,
			}),
			`[${citation.label}]`,
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
