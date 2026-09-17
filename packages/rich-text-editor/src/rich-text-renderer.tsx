import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo } from "react";

import { normalizeRichTextDocument } from "./document-validation";
import { createRichTextExtensions } from "./editor-extensions";
import { richTextReaderContentClassName } from "./rich-text-content-styles";
import type { RichTextRendererProps } from "./types";

/** Renders a persisted editor document using the same schema as the editor. */
export function RichTextRenderer({
	ariaLabel = "Rich text content",
	document,
	preset = "member",
}: RichTextRendererProps) {
	const normalizedDocument = normalizeRichTextDocument(document);
	const extensions = useMemo(
		() => createRichTextExtensions("", preset, { interactive: false }),
		[preset],
	);
	const editor = useEditor({
		content: normalizedDocument,
		editable: false,
		editorProps: {
			attributes: { "aria-label": ariaLabel, role: "document" },
		},
		extensions,
		immediatelyRender: false,
		shouldRerenderOnTransaction: false,
	});

	useEffect(() => {
		if (!editor) return;
		const nextDocument = normalizeRichTextDocument(document);
		if (JSON.stringify(editor.getJSON()) === JSON.stringify(nextDocument))
			return;
		editor.commands.setContent(nextDocument, { emitUpdate: false });
	}, [document, editor]);

	if (!editor) return null;

	return (
		<section className="overflow-hidden rounded-md border border-border bg-card text-card-foreground">
			<EditorContent
				className={richTextReaderContentClassName}
				editor={editor}
			/>
		</section>
	);
}
