import {
	BoldIcon,
	BookOpenIcon,
	HeadingIcon,
	HighlighterIcon,
	ItalicIcon,
	ListIcon,
	ListOrderedIcon,
	type LucideIcon,
	QuoteIcon,
	Redo2Icon,
	UnderlineIcon,
	Undo2Icon,
} from "lucide-react";
import { type MouseEvent, useRef } from "react";

import type { VerseRequest } from "./editor-actions";
import {
	type EditorSessionState,
	type EditorToolbarSession,
	useEditorSessionState,
} from "./editor-session";
import { useKeyboardDock } from "./use-keyboard-dock";

/** A button the docked toolbar can show. */
export type DockedToolbarItem =
	| "bold"
	| "bullet"
	| "heading"
	| "highlight"
	| "italic"
	| "numbered"
	| "quote"
	| "redo"
	| "underline"
	| "undo"
	| "verse";

/** Bold, Italic, List and Add a verse: enough for most writing, all labelled. */
export const defaultDockedToolbarItems = [
	"bold",
	"italic",
	"bullet",
	"verse",
] as const satisfies readonly DockedToolbarItem[];

type ItemDefinition = {
	icon: LucideIcon;
	/** Whether the button shows as pressed; omitted for one-off actions. */
	isActive?: (state: EditorSessionState) => boolean;
	isDisabled?: (state: EditorSessionState) => boolean;
	label: string;
	run: (session: EditorToolbarSession) => unknown;
};

const itemDefinitions: Record<
	Exclude<DockedToolbarItem, "verse">,
	ItemDefinition
> = {
	bold: {
		icon: BoldIcon,
		isActive: (state) => state.isBold,
		label: "Bold",
		run: (session) => session.toggleMark("bold"),
	},
	bullet: {
		icon: ListIcon,
		isActive: (state) => state.activeBlock === "bulletList",
		label: "List",
		run: (session) => session.applyCommand("bullet"),
	},
	heading: {
		icon: HeadingIcon,
		isActive: (state) => state.activeHeading === 2,
		label: "Heading",
		run: (session) => session.applyCommand("heading2"),
	},
	highlight: {
		icon: HighlighterIcon,
		isActive: (state) => state.isHighlight,
		label: "Highlight",
		run: (session) => session.toggleMark("highlight"),
	},
	italic: {
		icon: ItalicIcon,
		isActive: (state) => state.isItalic,
		label: "Italic",
		run: (session) => session.toggleMark("italic"),
	},
	numbered: {
		icon: ListOrderedIcon,
		isActive: (state) => state.activeBlock === "orderedList",
		label: "Numbered list",
		run: (session) => session.applyCommand("numbered"),
	},
	quote: {
		icon: QuoteIcon,
		isActive: (state) => state.activeBlock === "blockquote",
		label: "Quote",
		run: (session) => session.applyCommand("quote"),
	},
	redo: {
		icon: Redo2Icon,
		isDisabled: (state) => !state.canRedo,
		label: "Redo",
		run: (session) => session.redo(),
	},
	underline: {
		icon: UnderlineIcon,
		isActive: (state) => state.isUnderline,
		label: "Underline",
		run: (session) => session.toggleMark("underline"),
	},
	undo: {
		icon: Undo2Icon,
		isDisabled: (state) => !state.canUndo,
		label: "Undo",
		run: (session) => session.undo(),
	},
};

export type DockedToolbarProps = {
	className?: string;
	/** Which buttons to show, in order. "verse" needs `onRequestVerse`. */
	items?: readonly DockedToolbarItem[];
	/** Replaces a button's visible label, e.g. `{ bullet: "Bulleted list" }`. */
	labels?: Partial<Record<DockedToolbarItem, string>>;
	onRequestVerse?: VerseRequest;
	session: EditorToolbarSession;
};

/**
 * A toolbar for people who shouldn't have to discover formatting: every
 * button has an icon and a word, shows when it's on, and stays pinned to the
 * bottom of the screen (or the top of a phone's keyboard) while writing.
 */
export function DockedToolbar({
	className,
	items = defaultDockedToolbarItems,
	labels,
	onRequestVerse,
	session,
}: DockedToolbarProps) {
	const state = useEditorSessionState(session);
	const toolbarRef = useRef<HTMLDivElement>(null);
	const dock = useKeyboardDock(toolbarRef, true);
	const addVerse = async () => {
		const verse = await onRequestVerse?.();
		if (verse) session.insertVerseBlock(verse);
	};

	return (
		<div
			className={[
				"sticky bottom-5 z-10 flex justify-center pt-6",
				dock.isDocked ? "!fixed inset-x-0 bottom-auto z-50 px-3 pt-0" : "",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={dock.style}
		>
			<div
				aria-label="Formatting"
				className="flex flex-wrap items-center justify-center gap-0.5 rounded-2xl border border-border bg-card p-1.5 font-sans shadow-[0_8px_24px_rgb(27_46_75/0.08)] sm:gap-1"
				ref={toolbarRef}
				role="toolbar"
			>
				{items.map((item, index) => {
					if (item === "verse") {
						if (!onRequestVerse) return null;
						return (
							<span className="contents" key={item}>
								{index > 0 ? (
									<span
										aria-hidden="true"
										className="mx-1 hidden h-6 w-px bg-border sm:block"
									/>
								) : null}
								<button
									className={`${buttonClassName} bg-scripture px-3 font-semibold text-scripture-foreground hover:bg-scripture/80 sm:px-4`}
									onClick={() => void addVerse()}
									onMouseDown={keepEditorFocus}
									type="button"
								>
									<BookOpenIcon aria-hidden="true" />
									{labels?.verse ?? "Add a verse"}
								</button>
							</span>
						);
					}
					const definition = itemDefinitions[item];
					const Icon = definition.icon;
					return (
						<button
							aria-pressed={
								definition.isActive ? definition.isActive(state) : undefined
							}
							className={`${buttonClassName} px-2 font-medium text-foreground/85 hover:bg-secondary aria-pressed:bg-secondary aria-pressed:text-foreground sm:px-3.5`}
							disabled={definition.isDisabled?.(state)}
							key={item}
							onClick={() => definition.run(session)}
							onMouseDown={keepEditorFocus}
							type="button"
						>
							<Icon aria-hidden="true" />
							{labels?.[item] ?? definition.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Clicking a button would move focus off the writing, and the editor only
 * takes it back a frame later, so fast typing straight after a click was
 * lost. Keeping focus where it is also keeps the cursor and its formatting.
 */
export function keepEditorFocus(event: MouseEvent<HTMLButtonElement>) {
	event.preventDefault();
}

const buttonClassName =
	"inline-flex h-11 items-center gap-1.5 rounded-[10px] text-sm sm:gap-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4";
