import {
	formatVerseReference,
	getDocumentText,
	isValidVerseBlock,
	type RichTextDocument,
	type RichTextNode,
	type VerseBlockAttributes,
} from "@berean-study/rich-text-editor";

/** Converts a note to readable plain text, one block per paragraph. */
export function noteToPlainText(title: string, document: RichTextDocument) {
	const blocks = (document.content ?? []).flatMap(blockToLines);
	return [title.trim() || "Untitled note", ...blocks].join("\n\n").concat("\n");
}

function blockToLines(block: RichTextNode): string[] {
	switch (block.type) {
		case "heading":
			return [getDocumentText(block).toUpperCase()].filter(Boolean);
		case "bulletList":
		case "orderedList":
		case "taskList":
			return [
				(block.content ?? [])
					.map(
						(item, index) =>
							`${listMarker(block.type, item, index)} ${getDocumentText(item)}`,
					)
					.join("\n"),
			];
		case "verseBlock": {
			const attributes = block.attrs as
				| Partial<VerseBlockAttributes>
				| undefined;
			return isValidVerseBlock(attributes)
				? [`[${formatVerseReference(attributes)} · ${attributes.translation}]`]
				: [];
		}
		case "horizontalRule":
			return ["—"];
		default:
			return [getDocumentText(block)].filter(Boolean);
	}
}

function listMarker(
	type: string | undefined,
	item: RichTextNode,
	index: number,
) {
	if (type === "orderedList") return `${index + 1}.`;
	if (type === "taskList") return item.attrs?.checked ? "[x]" : "[ ]";
	return "-";
}

export function downloadTextFile(fileName: string, text: string) {
	const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
	const link = window.document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(url);
}

export function toFileName(title: string) {
	const slug = title
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return `${slug || "note"}.txt`;
}
