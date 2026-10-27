import { Editor, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { createRichTextExtensions } from "../src/editor-extensions";
import type { VerseBlockAttributes } from "../src/types";

const verse: VerseBlockAttributes = {
	book: "James",
	bookId: 59,
	chapter: 1,
	passageId: 4,
	translation: "ESV",
	verseEnd: 5,
	verseStart: 5,
};

const editors: Editor[] = [];

function createEditor(content: string | JSONContent) {
	const editor = new Editor({
		content,
		element: document.createElement("div"),
		extensions: createRichTextExtensions(),
	});
	editors.push(editor);
	return editor;
}

function verseNode(editor: Editor) {
	return editor.getJSON().content?.find((node) => node.type === "verseBlock");
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.destroy();
});

describe("Scripture (verse block) node", () => {
	it("keeps the saved verse text through JSON", () => {
		const withText = { ...verse, text: "If any of you lacks wisdom…" };
		const editor = createEditor({
			content: [{ attrs: withText, type: "verseBlock" }],
			type: "doc",
		});

		expect(verseNode(editor)?.attrs).toEqual(withText);
	});

	it("keeps the reference, translation and text through HTML", () => {
		const withText = { ...verse, text: "If any of you lacks wisdom…" };
		const editor = createEditor({
			content: [{ attrs: withText, type: "verseBlock" }],
			type: "doc",
		});
		const html = editor.getHTML();

		expect(html).toContain('data-translation="ESV"');
		expect(html).toContain("James 1:5 · ESV");
		expect(verseNode(createEditor(html))?.attrs).toEqual(withText);
	});

	it("serializes documents saved without text exactly as before", () => {
		const content = {
			content: [{ attrs: verse, type: "verseBlock" }],
			type: "doc",
		};
		const editor = createEditor(content);

		expect(JSON.parse(JSON.stringify(editor.getJSON()))).toStrictEqual(content);
		expect(verseNode(createEditor(editor.getHTML()))?.attrs).toEqual(verse);
	});

	it("drops a verse block whose reference is incomplete when parsing HTML", () => {
		const editor = createEditor(
			'<figure data-verse-block="true" data-book="James" data-translation="ESV"></figure><p>After</p>',
		);

		expect(verseNode(editor)).toBeUndefined();
	});
});
