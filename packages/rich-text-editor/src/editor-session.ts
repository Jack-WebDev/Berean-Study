import type { Editor, JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import { hasRichTextContent } from "./document-validation";
import {
	type PassageMentionState,
	passageMentionPluginKey,
} from "./passage-mentions";
import {
	type SlashCommandState,
	slashCommandPluginKey,
} from "./slash-commands";
import type {
	BibleReferenceAttributes,
	CitationAttributes,
	RichTextDocument,
	SectionVariant,
	VerseBlockAttributes,
} from "./types";

export type EditorSessionCommand =
	| "bullet"
	| "checklist"
	| "divider"
	| "heading1"
	| "heading2"
	| "heading3"
	| "numbered"
	| "paragraph"
	| "quote"
	| "table";

export type EditorSessionState = {
	activeBlock: "blockquote" | "bulletList" | "orderedList" | "taskList" | null;
	activeHeading: 1 | 2 | 3 | null;
	canRedo: boolean;
	canUndo: boolean;
	isBibleReference: boolean;
	isBold: boolean;
	isCitation: boolean;
	isCode: boolean;
	isHighlight: boolean;
	isItalic: boolean;
	isLink: boolean;
	isStrike: boolean;
	isTable: boolean;
	isUnderline: boolean;
};

/** Operations required to carry out a writing command. */
export type EditorCommandTarget = {
	applyCommand: (command: EditorSessionCommand) => boolean;
	insertBibleReference: (reference: BibleReferenceAttributes) => boolean;
	insertCitation: (citation: CitationAttributes) => boolean;
	insertVerseBlock: (attributes: VerseBlockAttributes) => boolean;
};

export type EditorSection = { text: string; variant: SectionVariant };

/** Operations used by outline tooling to build and navigate note sections. */
export type OutlineEditorSession = {
	/** Appends a section heading at the end and selects its text for typing. */
	appendSection: (section?: EditorSection) => boolean;
	/** Moves focus into the writing surface, at the start of the document. */
	focusDocument: () => boolean;
	focusSection: (index: number) => boolean;
	/**
	 * Fills an empty document with the sections and places the cursor under
	 * the first one; appends them when the document already has content.
	 */
	insertSections: (sections: readonly EditorSection[]) => boolean;
};

/** Operations used by the toolbar outside the shared command catalog. */
export type EditorToolbarSession = EditorCommandTarget & {
	applyLink: (href: string) => boolean;
	getLinkHref: () => string;
	removeLink: () => boolean;
	setTextAlignment: (alignment: "center" | "left" | "right") => boolean;
	toggleMark: (
		mark: "bold" | "code" | "highlight" | "italic" | "strike" | "underline",
	) => boolean;
	updateTable: (
		action:
			| "addColumn"
			| "addRow"
			| "delete"
			| "deleteColumn"
			| "deleteRow"
			| "toggleHeaderColumn"
			| "toggleHeaderRow",
	) => boolean;
	undo: () => boolean;
	redo: () => boolean;
};

/** Operations used by the slash-command menu to manage its interaction. */
export type SlashCommandSession = EditorCommandTarget & {
	clearSlashCommand: (from: number) => boolean;
	getSlashMenuPosition: (from: number) => { left: number; top: number };
	registerKeyDownListener: (
		listener: (event: KeyboardEvent) => void,
	) => () => void;
};

/** Operations used by the "@" menu that links a passage while writing. */
export type PassageMentionSession = {
	/** Replaces the typed "@reference" with a structured passage reference. */
	completePassageMention: (
		from: number,
		reference: BibleReferenceAttributes,
	) => boolean;
	/** Closes the menu for this mention and leaves the typed text alone. */
	dismissPassageMention: () => void;
	getSlashMenuPosition: SlashCommandSession["getSlashMenuPosition"];
	registerKeyDownListener: SlashCommandSession["registerKeyDownListener"];
};

/** Operations used by the workspace inspector to navigate the document. */
export type WorkspaceEditorSession = EditorCommandTarget & {
	deleteStructuredNode: (
		type: "bibleReference" | "citation",
		index: number,
	) => boolean;
	focusHeading: (index: number) => boolean;
	focusStructuredNode: (
		type: "bibleReference" | "citation" | "verseBlock",
		index: number,
	) => boolean;
};

/**
 * Full editor contract retained for host composition. Built-in UI adapters use
 * narrower contracts so they cannot depend on unrelated editor details.
 */
export type EditorSession = EditorToolbarSession &
	SlashCommandSession &
	PassageMentionSession &
	WorkspaceEditorSession &
	OutlineEditorSession & {
		getDocument: () => RichTextDocument;
		isSelectionInNode: (
			type: "bibleReference" | "citation" | "heading",
		) => boolean;
	};

const editors = new WeakMap<object, Editor>();

/**
 * Creates the editing boundary used by all UI adapters. Tiptap remains an
 * implementation detail; consumers receive semantic writing operations.
 */
export function createEditorSession(editor: Editor): EditorSession {
	let linkSelection: { from: number; to: number } | null = null;
	// Panels outside the editor take focus when clicked. Tiptap's focus()
	// refocuses on the next frame, and the browser then restores the old caret
	// over any selection set meanwhile, so focus the view synchronously first.
	const focusedChain = () => {
		if (!editor.view.hasFocus()) editor.view.focus();
		return editor.chain();
	};
	// Structural inserts often make the host re-render around the editor (an
	// empty state disappears, padding changes). Chrome can keep typing at a
	// stale caret even though the DOM selection reads correctly, so write the
	// selection again once that render has happened.
	const resyncDomSelection = (applied: boolean) => {
		if (!applied || typeof requestAnimationFrame === "undefined")
			return applied;
		requestAnimationFrame(() => {
			if (editor.isDestroyed || !editor.view.hasFocus()) return;
			const { anchor, head } = editor.state.selection;
			const start = editor.view.domAtPos(anchor);
			const end = editor.view.domAtPos(head);
			window
				.getSelection()
				?.setBaseAndExtent(start.node, start.offset, end.node, end.offset);
		});
		return applied;
	};
	const session: EditorSession = {
		applyCommand: (command) => {
			switch (command) {
				case "paragraph":
					return editor.chain().focus().setParagraph().run();
				case "heading1":
					return editor.chain().focus().toggleHeading({ level: 1 }).run();
				case "heading2":
					return editor.chain().focus().toggleHeading({ level: 2 }).run();
				case "heading3":
					return editor.chain().focus().toggleHeading({ level: 3 }).run();
				case "bullet":
					return editor.chain().focus().toggleBulletList().run();
				case "numbered":
					return editor.chain().focus().toggleOrderedList().run();
				case "checklist":
					return editor.chain().focus().toggleTaskList().run();
				case "quote":
					return editor.chain().focus().toggleBlockquote().run();
				case "divider":
					return editor.chain().focus().setHorizontalRule().run();
				case "table":
					return editor
						.chain()
						.focus()
						.insertTable({ cols: 3, rows: 3, withHeaderRow: true })
						.run();
			}
		},
		appendSection: (section = { text: "New section", variant: "section" }) => {
			const position = editor.state.doc.content.size;
			return resyncDomSelection(
				focusedChain()
					.insertContentAt(position, createSectionContent([section]))
					.setTextSelection({
						from: position + 1,
						to: position + 1 + section.text.length,
					})
					.scrollIntoView()
					.run(),
			);
		},
		applyLink: (href) => {
			const selection = linkSelection;
			if (!selection) return false;
			return editor
				.chain()
				.setTextSelection(selection)
				.focus()
				.extendMarkRange("link")
				.setLink({ href })
				.run();
		},
		clearSlashCommand: (from) =>
			editor.commands.deleteRange({ from, to: editor.state.selection.from }),
		completePassageMention: (from, reference) =>
			editor
				.chain()
				.focus()
				.deleteRange({ from, to: editor.state.selection.from })
				.insertBibleReference(reference)
				.insertContent(" ")
				.run(),
		dismissPassageMention: () => {
			editor.view.dispatch(
				editor.state.tr.setMeta(passageMentionPluginKey, { dismiss: true }),
			);
		},
		deleteStructuredNode: (type, index) => {
			const position = findNodePosition(editor, type, index);
			return position === null
				? false
				: editor
						.chain()
						.focus()
						.setNodeSelection(position)
						.deleteSelection()
						.run();
		},
		focusHeading: (index) => {
			const position = findNodePosition(editor, "heading", index);
			return position === null
				? false
				: focusedChain()
						.setTextSelection(position + 1)
						.scrollIntoView()
						.run();
		},
		focusDocument: () => editor.commands.focus("start"),
		focusSection: (index) => {
			const section = findSectionHeading(editor, index);
			return section
				? focusedChain()
						.setTextSelection(section.position + section.node.nodeSize - 1)
						.scrollIntoView()
						.run()
				: false;
		},
		focusStructuredNode: (type, index) => {
			const position = findNodePosition(editor, type, index);
			return position === null
				? false
				: focusedChain().setNodeSelection(position).scrollIntoView().run();
		},
		getDocument: () => editor.getJSON() as RichTextDocument,
		getLinkHref: () => {
			linkSelection = {
				from: editor.state.selection.from,
				to: editor.state.selection.to,
			};
			return (editor.getAttributes("link").href as string | undefined) ?? "";
		},
		isSelectionInNode: (type) =>
			editor.state.selection.$from.parent.type.name === type ||
			(editor.state.selection instanceof NodeSelection &&
				editor.state.selection.node.type.name === type),
		getSlashMenuPosition: (from) => {
			const coordinates = editor.view.coordsAtPos(from);
			const menuWidth = 256;
			const menuHeight = 280;
			return {
				left: Math.max(
					8,
					Math.min(coordinates.left, window.innerWidth - menuWidth),
				),
				top: Math.max(
					8,
					Math.min(coordinates.bottom + 8, window.innerHeight - menuHeight),
				),
			};
		},
		insertBibleReference: (reference) =>
			editor.commands.insertBibleReference(reference),
		insertCitation: (citation) => editor.commands.insertCitation(citation),
		insertSections: (sections) => {
			if (!sections.length) return false;
			const content = createSectionContent(sections);
			const isEmpty = !hasRichTextContent(editor.getJSON() as RichTextDocument);
			const start = isEmpty ? 0 : editor.state.doc.content.size;
			const chain = focusedChain();
			if (isEmpty) chain.setContent({ content, type: "doc" });
			else chain.insertContentAt(start, content);
			// A heading spans its text plus open and close tokens; the cursor
			// goes one position into the paragraph that follows it.
			const firstHeadingSize = (sections[0]?.text.length ?? 0) + 2;
			return resyncDomSelection(
				chain
					.setTextSelection(start + firstHeadingSize + 1)
					.scrollIntoView()
					.run(),
			);
		},
		insertVerseBlock: (attributes) =>
			resyncDomSelection(focusedChain().insertVerseBlock(attributes).run()),
		registerKeyDownListener: (listener) => {
			editor.view.dom.addEventListener("keydown", listener, true);
			return () =>
				editor.view.dom.removeEventListener("keydown", listener, true);
		},
		removeLink: () => {
			const selection = linkSelection;
			return selection
				? editor.chain().setTextSelection(selection).focus().unsetLink().run()
				: false;
		},
		setTextAlignment: (alignment) =>
			editor.chain().focus().setTextAlign(alignment).run(),
		toggleMark: (mark) => {
			switch (mark) {
				case "bold":
					return editor.chain().focus().toggleBold().run();
				case "code":
					return editor.chain().focus().toggleCode().run();
				case "highlight":
					return editor.chain().focus().toggleHighlight().run();
				case "italic":
					return editor.chain().focus().toggleItalic().run();
				case "underline":
					return editor.chain().focus().toggleUnderline().run();
				case "strike":
					return editor.chain().focus().toggleStrike().run();
			}
		},
		updateTable: (action) => {
			const chain = editor.chain().focus();
			switch (action) {
				case "addRow":
					return chain.addRowAfter().run();
				case "deleteRow":
					return chain.deleteRow().run();
				case "addColumn":
					return chain.addColumnAfter().run();
				case "deleteColumn":
					return chain.deleteColumn().run();
				case "toggleHeaderRow":
					return chain.toggleHeaderRow().run();
				case "toggleHeaderColumn":
					return chain.toggleHeaderColumn().run();
				case "delete":
					return chain.deleteTable().run();
			}
		},
		undo: () => editor.chain().focus().undo().run(),
		redo: () => editor.chain().focus().redo().run(),
	};

	editors.set(session, editor);
	return session;
}

/** Reads current editing state without exposing the underlying Tiptap editor. */
export function useEditorSessionState(
	session: EditorToolbarSession,
): EditorSessionState {
	const editor = getEditor(session);
	return useEditorState({
		editor,
		selector: ({ editor: currentEditor }): EditorSessionState => ({
			activeBlock: getActiveBlock(currentEditor),
			activeHeading: getActiveHeading(currentEditor),
			canRedo: currentEditor.can().redo(),
			canUndo: currentEditor.can().undo(),
			isBibleReference: currentEditor.isActive("bibleReference"),
			isBold: currentEditor.isActive("bold"),
			isCitation: currentEditor.isActive("citation"),
			isCode: currentEditor.isActive("code"),
			isHighlight: currentEditor.isActive("highlight"),
			isItalic: currentEditor.isActive("italic"),
			isLink: currentEditor.isActive("link"),
			isStrike: currentEditor.isActive("strike"),
			isTable: currentEditor.isActive("table"),
			isUnderline: currentEditor.isActive("underline"),
		}),
	});
}

/** Reads slash-command state without exposing the editor selection or plugin. */
export function useSlashCommandState(
	session: SlashCommandSession,
): SlashCommandState {
	const editor = getEditor(session);
	return useEditorState({
		editor,
		selector: ({ editor: currentEditor }) =>
			slashCommandPluginKey.getState(currentEditor.state) as SlashCommandState,
	});
}

/** Reads the "@reference" being typed, or null when there isn't one. */
export function usePassageMentionState(
	session: PassageMentionSession,
): PassageMentionState {
	const editor = getEditor(session);
	return useEditorState({
		editor,
		selector: ({ editor: currentEditor }) =>
			passageMentionPluginKey.getState(currentEditor.state)?.mention ?? null,
	});
}

function getEditor(session: object) {
	const editor = editors.get(session);
	if (!editor) throw new Error("Unknown editor session.");
	return editor;
}

function getActiveBlock(editor: Editor): EditorSessionState["activeBlock"] {
	for (const block of [
		"taskList",
		"blockquote",
		"bulletList",
		"orderedList",
	] as const)
		if (editor.isActive(block)) return block;
	return null;
}

function getActiveHeading(editor: Editor): 1 | 2 | 3 | null {
	for (const level of [1, 2, 3] as const)
		if (editor.isActive("heading", { level })) return level;
	return null;
}

/** Index of the outline section containing the cursor, or null before the first. */
export function getActiveSectionIndex(editor: Editor): number | null {
	const topLevelIndex = editor.state.selection.$from.index(0);
	let sectionIndex: number | null = null;
	editor.state.doc.forEach((node, _offset, index) => {
		if (index <= topLevelIndex && isSectionHeadingNode(node))
			sectionIndex = (sectionIndex ?? -1) + 1;
	});
	return sectionIndex;
}

function findSectionHeading(
	editor: Editor,
	index: number,
): { node: ProseMirrorNode; position: number } | null {
	const sections: { node: ProseMirrorNode; position: number }[] = [];
	editor.state.doc.forEach((node, position) => {
		if (isSectionHeadingNode(node)) sections.push({ node, position });
	});
	return sections[index] ?? null;
}

/** Mirrors `isSectionHeading` in document-utils for live editor nodes. */
function isSectionHeadingNode(node: ProseMirrorNode) {
	if (node.type.name !== "heading") return false;
	return Boolean(node.attrs.variant) || node.attrs.level <= 2;
}

function createSectionContent(
	sections: readonly EditorSection[],
): JSONContent[] {
	return sections.flatMap(({ text, variant }) => [
		{
			attrs: { level: 2, variant },
			content: text ? [{ text, type: "text" }] : undefined,
			type: "heading",
		},
		{ type: "paragraph" },
	]);
}

function findNodePosition(editor: Editor, type: string, index: number) {
	let found = 0;
	let position: number | null = null;
	editor.state.doc.descendants((node, pos) => {
		if (node.type.name !== type) return;
		if (found++ === index) {
			position = pos;
			return false;
		}
	});
	return position;
}
