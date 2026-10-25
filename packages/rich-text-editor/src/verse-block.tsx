import { mergeAttributes, Node } from "@tiptap/core";
import {
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";
import { LinkIcon } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";

import type { VerseBlockAttributes, VerseText } from "./types";
import { formatVerseReference, isValidVerseBlock } from "./verse-reference";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		verseBlock: {
			insertVerseBlock: (attributes: VerseBlockAttributes) => ReturnType;
		};
	}
}

/** Host-owned Bible access for Verse blocks rendered anywhere below it. */
export type VerseBlockSource = {
	loadVerses?: (attributes: VerseBlockAttributes) => Promise<VerseText[]>;
	onOpen?: (attributes: VerseBlockAttributes) => void;
};

const VerseBlockContext = createContext<VerseBlockSource>({});

export const VerseBlockProvider = VerseBlockContext.Provider;

const attributeNames = [
	"book",
	"bookId",
	"chapter",
	"passageId",
	"translation",
	"verseEnd",
	"verseStart",
] as const satisfies ReadonlyArray<keyof VerseBlockAttributes>;

const numericAttributes = new Set<string>([
	"bookId",
	"chapter",
	"passageId",
	"verseEnd",
	"verseStart",
]);

type VerseState =
	| { key: string; status: "loading" }
	| { key: string; status: "failed" }
	| { key: string; status: "ready"; verses: VerseText[] };

function VerseBlockView({ node, selected }: NodeViewProps) {
	const attributes = node.attrs as Partial<VerseBlockAttributes>;
	const {
		book,
		bookId,
		chapter,
		passageId,
		translation,
		verseEnd,
		verseStart,
	} = attributes;
	const { loadVerses, onOpen } = useContext(VerseBlockContext);
	const isValid = isValidVerseBlock(attributes);
	const key = isValid ? toVerseKey(attributes) : "";
	const [state, setState] = useState<VerseState>({ key, status: "loading" });

	useEffect(() => {
		const request = {
			book,
			bookId,
			chapter,
			passageId,
			translation,
			verseEnd,
			verseStart,
		};
		if (!isValidVerseBlock(request) || !loadVerses) return;
		const requestKey = toVerseKey(request);
		let active = true;
		setState({ key: requestKey, status: "loading" });
		loadVerses(request)
			.then((verses) => {
				if (active) setState({ key: requestKey, status: "ready", verses });
			})
			.catch(() => {
				if (active) setState({ key: requestKey, status: "failed" });
			});
		return () => {
			active = false;
		};
	}, [
		book,
		bookId,
		chapter,
		loadVerses,
		passageId,
		translation,
		verseEnd,
		verseStart,
	]);

	if (!isValid) {
		return (
			<NodeViewWrapper
				as="figure"
				className="my-1 rounded-[14px] border border-scripture-border bg-card px-5 py-4 font-sans text-muted-foreground text-sm"
				data-invalid="true"
			>
				Quoted verse unavailable
			</NodeViewWrapper>
		);
	}

	const reference = formatVerseReference(attributes);
	const current = state.key === key ? state : { status: "loading" as const };

	return (
		<NodeViewWrapper
			as="figure"
			className="my-1 flex flex-col gap-2.5 rounded-[14px] border border-scripture-border bg-card px-5 py-[18px] data-[selected=true]:ring-2 data-[selected=true]:ring-ring/50"
			data-selected={selected || undefined}
			data-verse-block="true"
		>
			<blockquote className="m-0 font-serif text-[1em] text-foreground/90 italic leading-[1.6]">
				{current.status === "ready" && current.verses.length ? (
					current.verses.map((verse) => (
						<span key={verse.number}>
							<sup className="mr-1 font-sans font-semibold text-[11px] text-scripture-number not-italic">
								{verse.number}
							</sup>
							{verse.text}{" "}
						</span>
					))
				) : (
					<span className="font-sans text-muted-foreground text-sm not-italic">
						{current.status === "loading" && loadVerses
							? "Loading verse…"
							: "Verse text unavailable."}
					</span>
				)}
			</blockquote>
			<figcaption className="font-sans text-[13px] text-scripture-foreground">
				<button
					className="inline-flex min-h-6 items-center gap-2 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:no-underline"
					contentEditable={false}
					disabled={!onOpen}
					onClick={() => onOpen?.(attributes)}
					type="button"
				>
					<LinkIcon aria-hidden="true" className="size-3.5" />
					{reference} · {attributes.translation} · linked
				</button>
			</figcaption>
		</NodeViewWrapper>
	);
}

/** A quoted Scripture range stored as a structured reference, not free text. */
export const VerseBlock = Node.create({
	name: "verseBlock",
	group: "block",
	atom: true,
	selectable: true,
	draggable: false,

	addAttributes() {
		return Object.fromEntries(
			attributeNames.map((name) => [name, { default: null }]),
		);
	},

	parseHTML() {
		return [
			{
				tag: 'figure[data-verse-block="true"]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) return false;
					const attributes = Object.fromEntries(
						attributeNames.map((name) => {
							const value = element.getAttribute(`data-${toKebabCase(name)}`);
							return [
								name,
								numericAttributes.has(name) ? Number(value) : value,
							];
						}),
					);
					return isValidVerseBlock(attributes) ? attributes : false;
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		const attributes = HTMLAttributes as Partial<VerseBlockAttributes>;
		if (!isValidVerseBlock(attributes)) {
			return [
				"figure",
				{ "data-verse-block-invalid": "true" },
				"Quoted verse unavailable",
			];
		}
		return [
			"figure",
			mergeAttributes(
				{ "data-verse-block": "true" },
				Object.fromEntries(
					attributeNames.map((name) => [
						`data-${toKebabCase(name)}`,
						attributes[name],
					]),
				),
			),
			`${formatVerseReference(attributes)} · ${attributes.translation}`,
		];
	},

	addCommands() {
		return {
			insertVerseBlock:
				(attributes) =>
				({ commands }) => {
					if (!isValidVerseBlock(attributes)) return false;
					return commands.insertContent({ attrs: attributes, type: this.name });
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(VerseBlockView);
	},
});

function toVerseKey(attributes: VerseBlockAttributes) {
	return attributeNames.map((name) => attributes[name]).join("|");
}

function toKebabCase(value: string) {
	return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
