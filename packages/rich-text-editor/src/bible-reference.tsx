import { mergeAttributes, Node } from "@tiptap/core";
import {
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";
import { BookOpenIcon } from "lucide-react";

import type { BibleReferenceAttributes } from "./types";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		bibleReference: {
			insertBibleReference: (reference: BibleReferenceAttributes) => ReturnType;
		};
	}
}

export function isValidBibleReference(
	reference: Partial<BibleReferenceAttributes> | null | undefined,
): reference is BibleReferenceAttributes {
	const passageId = reference?.passageId;
	const label = reference?.label;
	return Boolean(
		reference &&
			Number.isInteger(passageId) &&
			typeof passageId === "number" &&
			passageId > 0 &&
			typeof label === "string" &&
			label.trim(),
	);
}

const BibleReferenceView = ({ node }: NodeViewProps) => {
	const reference = node.attrs as Partial<BibleReferenceAttributes>;
	const label = isValidBibleReference(reference)
		? reference.label
		: "Bible reference unavailable";

	return (
		<NodeViewWrapper
			as="span"
			className="inline-flex cursor-pointer select-none items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 font-medium font-sans text-primary text-sm leading-none"
			data-bible-reference="true"
			data-passage-id={
				isValidBibleReference(reference) ? reference.passageId : undefined
			}
			data-invalid={!isValidBibleReference(reference) || undefined}
			title={label}
		>
			<BookOpenIcon aria-hidden="true" className="size-3.5" />
			{label}
		</NodeViewWrapper>
	);
};

/** A structured, selectable inline reference to a Berean Study passage. */
export const BibleReference = Node.create({
	name: "bibleReference",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			label: { default: null },
			passageId: { default: null },
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-bible-reference="true"]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) return false;
					const reference = {
						label:
							element.getAttribute("data-label") ?? element.textContent ?? "",
						passageId: Number(element.getAttribute("data-passage-id")),
					};
					return isValidBibleReference(reference) ? reference : false;
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		const reference = HTMLAttributes as Partial<BibleReferenceAttributes>;
		if (!isValidBibleReference(reference)) {
			return [
				"span",
				{ "data-bible-reference-invalid": "true" },
				"Bible reference unavailable",
			];
		}
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-bible-reference": "true",
				"data-label": reference.label,
				"data-passage-id": reference.passageId,
			}),
			reference.label,
		];
	},

	addCommands() {
		return {
			insertBibleReference:
				(reference) =>
				({ commands }) => {
					if (!isValidBibleReference(reference)) return false;
					return commands.insertContent({
						attrs: reference,
						type: this.name,
					});
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(BibleReferenceView);
	},
});
