import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";

import {
	type SlashCommandState,
	slashCommandPluginKey,
} from "./slash-commands";
import type {
	BibleReferenceAttributes,
	CitationAttributes,
	RichTextDocument,
} from "./types";

export type EditorSessionCommand =
	| "bullet"
	| "divider"
	| "heading2"
	| "heading3"
	| "numbered"
	| "paragraph"
	| "quote"
	| "table";

export type EditorSessionState = {
	activeBlock: "blockquote" | "bulletList" | "orderedList" | null;
	activeHeading: 2 | 3 | null;
	canRedo: boolean;
	canUndo: boolean;
	isBibleReference: boolean;
	isBold: boolean;
	isCitation: boolean;
	isItalic: boolean;
	isLink: boolean;
	isStrike: boolean;
	isTable: boolean;
	isUnderline: boolean;
};

export type EditorSession = {
	applyCommand: (command: EditorSessionCommand) => boolean;
	applyLink: (href: string) => boolean;
	clearSlashCommand: (from: number) => boolean;
	deleteStructuredNode: (
		type: "bibleReference" | "citation",
		index: number,
	) => boolean;
	focusHeading: (index: number) => boolean;
	focusStructuredNode: (
		type: "bibleReference" | "citation",
		index: number,
	) => boolean;
	getDocument: () => RichTextDocument;
	getLinkHref: () => string;
	isSelectionInNode: (
		type: "bibleReference" | "citation" | "heading",
	) => boolean;
	getSlashMenuPosition: (from: number) => { left: number; top: number };
	insertBibleReference: (reference: BibleReferenceAttributes) => boolean;
	insertCitation: (citation: CitationAttributes) => boolean;
	registerKeyDownListener: (
		listener: (event: KeyboardEvent) => void,
	) => () => void;
	removeLink: () => boolean;
	setTextAlignment: (alignment: "center" | "left" | "right") => boolean;
	toggleMark: (mark: "bold" | "italic" | "strike" | "underline") => boolean;
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

const editors = new WeakMap<EditorSession, Editor>();

/**
 * Creates the editing boundary used by all UI adapters. Tiptap remains an
 * implementation detail; consumers receive semantic writing operations.
 */
export function createEditorSession(editor: Editor): EditorSession {
	let linkSelection: { from: number; to: number } | null = null;
	const session: EditorSession = {
		applyCommand: (command) => {
			switch (command) {
				case "paragraph":
					return editor.chain().focus().setParagraph().run();
				case "heading2":
					return editor.chain().focus().toggleHeading({ level: 2 }).run();
				case "heading3":
					return editor.chain().focus().toggleHeading({ level: 3 }).run();
				case "bullet":
					return editor.chain().focus().toggleBulletList().run();
				case "numbered":
					return editor.chain().focus().toggleOrderedList().run();
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
				: editor
						.chain()
						.focus()
						.setTextSelection(position + 1)
						.scrollIntoView()
						.run();
		},
		focusStructuredNode: (type, index) => {
			const position = findNodePosition(editor, type, index);
			return position === null
				? false
				: editor
						.chain()
						.focus()
						.setNodeSelection(position)
						.scrollIntoView()
						.run();
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
	session: EditorSession,
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
	session: EditorSession,
): SlashCommandState {
	const editor = getEditor(session);
	return useEditorState({
		editor,
		selector: ({ editor: currentEditor }) =>
			slashCommandPluginKey.getState(currentEditor.state) as SlashCommandState,
	});
}

function getEditor(session: EditorSession) {
	const editor = editors.get(session);
	if (!editor) throw new Error("Unknown editor session.");
	return editor;
}

function getActiveBlock(editor: Editor): EditorSessionState["activeBlock"] {
	for (const block of ["blockquote", "bulletList", "orderedList"] as const)
		if (editor.isActive(block)) return block;
	return null;
}

function getActiveHeading(editor: Editor): 2 | 3 | null {
	if (editor.isActive("heading", { level: 2 })) return 2;
	if (editor.isActive("heading", { level: 3 })) return 3;
	return null;
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
