import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";
import { DockedToolbar } from "./docked-toolbar";
import {
	hasRichTextContent,
	normalizeRichTextDocument,
} from "./document-validation";
import {
	createRichTextExtensions,
	transformPastedHtml,
} from "./editor-extensions";
import { createEditorSession, getActiveSectionIndex } from "./editor-session";
import { EditorToolbar } from "./editor-toolbar";
import { PassageMentionMenu } from "./passage-mention-menu";
import { richTextContentClassName } from "./rich-text-content-styles";
import { SlashCommandMenu } from "./slash-command-menu";
import type { RichTextDocument, RichTextEditorProps } from "./types";

export function RichTextEditor({
	ariaLabel = "Rich text editor",
	className,
	contentClassName,
	editable = true,
	emptyState,
	footer,
	id,
	onActiveSectionChange,
	onChange,
	onExpand,
	onSessionReady,
	onRequestBibleReference,
	onRequestCitation,
	onRequestPerson,
	onRequestVerse,
	passageMentions,
	placeholder = "Start writing…",
	preset = "member",
	slashCommands,
	toolbar = "full",
	toolbarItems,
	value,
}: RichTextEditorProps) {
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const onActiveSectionChangeRef = useRef(onActiveSectionChange);
	onActiveSectionChangeRef.current = onActiveSectionChange;
	const extensions = useMemo(
		() => createRichTextExtensions(placeholder, preset),
		[placeholder, preset],
	);
	const editor = useEditor({
		content: normalizeRichTextDocument(value),
		editable,
		extensions,
		immediatelyRender: false,
		onSelectionUpdate: ({ editor: currentEditor }) =>
			onActiveSectionChangeRef.current?.(getActiveSectionIndex(currentEditor)),
		onUpdate: ({ editor: currentEditor }) =>
			onChangeRef.current(currentEditor.getJSON() as RichTextDocument),
		shouldRerenderOnTransaction: false,
		editorProps: {
			attributes: {
				"aria-label": ariaLabel,
				...(id ? { id } : {}),
				role: "textbox",
			},
			transformPastedHTML: transformPastedHtml,
		},
	});
	const session = useMemo(
		() => (editor ? createEditorSession(editor) : null),
		[editor],
	);
	const citationRequest =
		preset === "contributor" ? onRequestCitation : undefined;

	useEffect(() => {
		// Tiptap reports an "update" from setEditable unless told not to, which
		// made every editor look edited the moment it loaded (and autosaved).
		if (editor && editor.isEditable !== editable)
			editor.setEditable(editable, false);
	}, [editable, editor]);

	useEffect(() => {
		if (!session) return;
		onSessionReady?.(session);
		return () => onSessionReady?.(null);
	}, [onSessionReady, session]);

	useEffect(() => {
		const nextDocument = normalizeRichTextDocument(value);
		if (!editor || documentsEqual(editor.getJSON(), nextDocument)) return;
		editor.commands.setContent(nextDocument, { emitUpdate: false });
	}, [editor, value]);

	if (!editor || !session) return null;

	const isEmpty = !hasRichTextContent(normalizeRichTextDocument(value));

	return (
		<section
			data-rich-text-editor=""
			className={[
				// overflow-clip (not hidden) keeps the sticky toolbar working.
				"relative overflow-clip rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/8",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			{editable && toolbar !== "docked" ? (
				<EditorToolbar
					session={session}
					onExpand={onExpand}
					onRequestBibleReference={onRequestBibleReference}
					onRequestCitation={citationRequest}
					onRequestVerse={onRequestVerse}
					preset={preset}
					variant={toolbar}
				/>
			) : null}
			<EditorContent
				className={[richTextContentClassName, contentClassName]
					.filter(Boolean)
					.join(" ")}
				editor={editor}
			/>
			{editable && isEmpty ? emptyState : null}
			{editable && toolbar === "docked" ? (
				<DockedToolbar
					items={toolbarItems}
					onRequestVerse={onRequestVerse}
					session={session}
				/>
			) : null}
			{footer ? (
				<footer className="border-border border-t">{footer}</footer>
			) : null}
			{editable ? (
				<SlashCommandMenu
					items={slashCommands}
					session={session}
					onRequestBibleReference={onRequestBibleReference}
					onRequestCitation={citationRequest}
					onRequestPerson={onRequestPerson}
					onRequestVerse={onRequestVerse}
					preset={preset}
				/>
			) : null}
			{editable && passageMentions ? (
				<PassageMentionMenu session={session} source={passageMentions} />
			) : null}
		</section>
	);
}

function documentsEqual(left: unknown, right: unknown) {
	return JSON.stringify(left) === JSON.stringify(right);
}
