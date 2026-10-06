import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";
import { normalizeRichTextDocument } from "./document-validation";
import {
	createRichTextExtensions,
	transformPastedHtml,
} from "./editor-extensions";
import { createEditorSession } from "./editor-session";
import { EditorToolbar } from "./editor-toolbar";
import { richTextContentClassName } from "./rich-text-content-styles";
import { SlashCommandMenu } from "./slash-command-menu";
import type { RichTextDocument, RichTextEditorProps } from "./types";

export function RichTextEditor({
	ariaLabel = "Rich text editor",
	className,
	contentClassName,
	editable = true,
	footer,
	id,
	onChange,
	onSessionReady,
	onRequestBibleReference,
	onRequestCitation,
	placeholder = "Start writing…",
	preset = "member",
	value,
}: RichTextEditorProps) {
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const extensions = useMemo(
		() => createRichTextExtensions(placeholder, preset),
		[placeholder, preset],
	);
	const editor = useEditor({
		content: normalizeRichTextDocument(value),
		editable,
		extensions,
		immediatelyRender: false,
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

	useEffect(() => {
		if (editor) editor.setEditable(editable);
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

	return (
		<section
			className={[
				"relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/8",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			{editable ? (
				<EditorToolbar
					session={session}
					onRequestBibleReference={onRequestBibleReference}
					onRequestCitation={
						preset === "contributor" ? onRequestCitation : undefined
					}
					preset={preset}
				/>
			) : null}
			<EditorContent
				className={[richTextContentClassName, contentClassName]
					.filter(Boolean)
					.join(" ")}
				editor={editor}
			/>
			{footer ? (
				<footer className="border-border border-t">{footer}</footer>
			) : null}
			{editable ? (
				<SlashCommandMenu
					session={session}
					onRequestBibleReference={onRequestBibleReference}
					onRequestCitation={
						preset === "contributor" ? onRequestCitation : undefined
					}
					preset={preset}
				/>
			) : null}
		</section>
	);
}

function documentsEqual(left: unknown, right: unknown) {
	return JSON.stringify(left) === JSON.stringify(right);
}
