import { mergeAttributes, Node } from "@tiptap/core";
import {
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";

import {
	contentBlockKindLabels,
	isValidContentBlock,
} from "./commentary-nodes";
import type { ContentBlockAttributes } from "./document-types";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		contentBlock: {
			insertContentBlock: (block: ContentBlockAttributes) => ReturnType;
		};
	}
}

function ContentBlockView({ node, selected }: NodeViewProps) {
	const block = node.attrs as Partial<ContentBlockAttributes>;
	return (
		<NodeViewWrapper
			className={`my-3 select-none rounded-xl border bg-status-info p-3 font-sans text-status-info-foreground ${selected ? "ring-2 ring-ring" : "border-transparent"}`}
			data-content-block="true"
		>
			{isValidContentBlock(block) ? (
				<>
					<span className="block font-bold text-[0.625rem] uppercase tracking-[0.16em]">
						{contentBlockKindLabels[block.kind]}
					</span>
					<span className="mt-1 block font-medium text-sm">{block.label}</span>
				</>
			) : (
				"Block unavailable"
			)}
		</NodeViewWrapper>
	);
}

/** A reviewed question, note or cross-reference placed inside contributor writing. */
export const ContentBlock = Node.create({
	name: "contentBlock",
	group: "block",
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			kind: { default: null },
			label: { default: null },
			scopeKey: { default: null },
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-content-block="true"]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) return false;
					const block = {
						kind: element.getAttribute("data-kind"),
						label: element.textContent ?? "",
						scopeKey: element.getAttribute("data-scope-key"),
					} as ContentBlockAttributes;
					return isValidContentBlock(block) ? block : false;
				},
			},
		];
	},

	renderHTML({ node }) {
		const block = node.attrs as Partial<ContentBlockAttributes>;
		if (!isValidContentBlock(block)) return ["div", {}, "Block unavailable"];
		return [
			"div",
			mergeAttributes({
				"data-content-block": "true",
				"data-kind": block.kind,
				"data-scope-key": block.scopeKey,
			}),
			block.label,
		];
	},

	addCommands() {
		return {
			insertContentBlock:
				(block) =>
				({ commands }) => {
					if (!isValidContentBlock(block)) return false;
					return commands.insertContent({ attrs: block, type: this.name });
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(ContentBlockView);
	},
});
