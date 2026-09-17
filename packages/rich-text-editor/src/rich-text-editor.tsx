import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";

import {
	createRichTextExtensions,
	transformPastedHtml,
} from "./editor-extensions";
import { EditorToolbar } from "./editor-toolbar";
import type { RichTextDocument, RichTextEditorProps } from "./types";

const emptyDocument: RichTextDocument = {
	content: [{ type: "paragraph" }],
	type: "doc",
};

export function RichTextEditor({
	editable = true,
	onChange,
	placeholder = "Start writing…",
	value,
}: RichTextEditorProps) {
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const extensions = useMemo(
		() => createRichTextExtensions(placeholder),
		[placeholder],
	);
	const editor = useEditor({
		content: value ?? emptyDocument,
		editable,
		extensions,
		immediatelyRender: false,
		onUpdate: ({ editor: currentEditor }) =>
			onChangeRef.current(currentEditor.getJSON() as RichTextDocument),
		shouldRerenderOnTransaction: false,
		editorProps: {
			transformPastedHTML: transformPastedHtml,
		},
	});

	useEffect(() => {
		if (editor) editor.setEditable(editable);
	}, [editable, editor]);

	useEffect(() => {
		if (!editor || documentsEqual(editor.getJSON(), value)) return;
		editor.commands.setContent(value, { emitUpdate: false });
	}, [editor, value]);

	if (!editor) return null;

	return (
		<section className="overflow-hidden rounded-md border border-border bg-card text-card-foreground">
			{editable ? <EditorToolbar editor={editor} /> : null}
			<EditorContent
				className="rich-text-editor-content font-serif text-[0.95rem] leading-7 [&_.ProseMirror]:min-h-72 [&_.ProseMirror]:px-5 [&_.ProseMirror]:py-4 [&_.ProseMirror]:outline-none [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:my-5 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_h2]:mt-8 [&_.ProseMirror_h2]:font-sans [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h3]:mt-6 [&_.ProseMirror_h3]:font-sans [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-base [&_.ProseMirror_hr]:my-6 [&_.ProseMirror_hr]:border-border [&_.ProseMirror_li]:ml-5 [&_.ProseMirror_ol]:my-4 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p]:my-3 [&_.ProseMirror_table]:my-5 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:bg-muted/50 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_ul]:my-4"
				editor={editor}
			/>
		</section>
	);
}

function documentsEqual(left: unknown, right: unknown) {
	return JSON.stringify(left) === JSON.stringify(right);
}
