import { mergeAttributes, Node } from "@tiptap/core";
import {
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";

import { isValidScriptureReference } from "./commentary-nodes";
import type { ScriptureReferenceAttributes } from "./document-types";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		scriptureReference: {
			insertScriptureReference: (
				reference: ScriptureReferenceAttributes,
			) => ReturnType;
		};
	}
}

const chipClassName =
	"inline-flex select-none items-center rounded-sm bg-status-info px-1.5 py-0.5 font-medium font-sans text-sm text-status-info-foreground leading-none";

function ScriptureReferenceView({ node }: NodeViewProps) {
	const reference = node.attrs as Partial<ScriptureReferenceAttributes>;
	const valid = isValidScriptureReference(reference);
	return (
		<NodeViewWrapper
			as="span"
			className={chipClassName}
			data-invalid={!valid || undefined}
			data-scripture-reference="true"
		>
			{valid
				? `${reference.variant === "cross" ? "See also " : ""}${reference.label}`
				: "Reference unavailable"}
		</NodeViewWrapper>
	);
}

/** A Scripture reference or cross-reference in contributor writing. */
export const ScriptureReference = Node.create({
	name: "scriptureReference",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			bookSlug: { default: null },
			label: { default: null },
			variant: { default: "reference" },
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-scripture-reference="true"]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) return false;
					const reference = {
						bookSlug: element.getAttribute("data-book-slug") ?? "",
						label: element.getAttribute("data-label") ?? "",
						variant: element.getAttribute("data-variant-kind") ?? "reference",
					} as ScriptureReferenceAttributes;
					return isValidScriptureReference(reference) ? reference : false;
				},
			},
		];
	},

	renderHTML({ node }) {
		const reference = node.attrs as Partial<ScriptureReferenceAttributes>;
		if (!isValidScriptureReference(reference)) {
			return ["span", {}, "Reference unavailable"];
		}
		return [
			"span",
			mergeAttributes({
				"data-book-slug": reference.bookSlug,
				"data-label": reference.label,
				"data-scripture-reference": "true",
				"data-variant-kind": reference.variant,
			}),
			reference.label,
		];
	},

	addCommands() {
		return {
			insertScriptureReference:
				(reference) =>
				({ commands }) => {
					if (!isValidScriptureReference(reference)) return false;
					return commands.insertContent({
						attrs: reference,
						type: this.name,
					});
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(ScriptureReferenceView);
	},
});
