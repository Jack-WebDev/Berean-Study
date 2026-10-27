import {
	getDocumentVerseReferences,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";

/** The first verse an entry quotes, or the first passage it was linked to. */
export function getPrimaryReference(
	content: RichTextDocument,
	passages: readonly { title: string | null }[] = [],
) {
	return (
		getDocumentVerseReferences(content)[0]?.label ??
		passages.find((passage) => passage.title)?.title ??
		null
	);
}
