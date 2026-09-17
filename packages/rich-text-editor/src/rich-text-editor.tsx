import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";
import { normalizeRichTextDocument } from "./document-validation";
import {
	createRichTextExtensions,
	transformPastedHtml,
} from "./editor-extensions";
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
	onEditorReady,
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

	useEffect(() => {
		if (editor) editor.setEditable(editable);
	}, [editable, editor]);

	useEffect(() => {
		if (!editor) return;
		onEditorReady?.(editor);
		return () => onEditorReady?.(null);
	}, [editor, onEditorReady]);

	useEffect(() => {
		const nextDocument = normalizeRichTextDocument(value);
		if (!editor || documentsEqual(editor.getJSON(), nextDocument)) return;
		editor.commands.setContent(nextDocument, { emitUpdate: false });
	}, [editor, value]);

	if (!editor) return null;

	return (
		<section
			className={[
				"relative overflow-hidden rounded-md border border-border bg-card text-card-foreground",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			{editable ? (
				<EditorToolbar
					editor={editor}
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
					editor={editor}
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
