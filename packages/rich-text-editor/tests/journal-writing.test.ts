import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import {
	getDocumentSectionTexts,
	getExcerpt,
	getPlainText,
} from "../src/document-utils";
import { createRichTextExtensions } from "../src/editor-extensions";
import { createEditorSession } from "../src/editor-session";
import {
	createReflectionTemplate,
	createTestimonyTemplate,
} from "../src/templates";
import type { RichTextDocument } from "../src/types";

const editors: Editor[] = [];

function createEditor(content: RichTextDocument) {
	const editor = new Editor({
		content,
		element: document.createElement("div"),
		extensions: createRichTextExtensions(),
	});
	editors.push(editor);
	return editor;
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.destroy();
});

const prayer: RichTextDocument = {
	content: [
		{
			attrs: { level: 2 },
			content: [{ text: "Lord", type: "text" }],
			type: "heading",
		},
		{
			content: [
				{ marks: [{ type: "bold" }], text: "Gi", type: "text" },
				{ text: "ve me wisdom", type: "text" },
				{ type: "hardBreak" },
				{ text: "and   patience.", type: "text" },
			],
			type: "paragraph",
		},
		{
			attrs: {
				book: "James",
				bookId: 59,
				chapter: 1,
				passageId: 4,
				text: "If any of you lacks wisdom",
				translation: "ESV",
				verseEnd: 5,
				verseStart: 5,
			},
			type: "verseBlock",
		},
		{
			content: [
				{
					content: [
						{ content: [{ text: "Rest", type: "text" }], type: "paragraph" },
					],
					type: "listItem",
				},
			],
			type: "bulletList",
		},
		{ type: "paragraph" },
	],
	type: "doc",
};

describe("plain-text excerpt helpers", () => {
	it("keeps words whole across formatting and puts each block on its own line", () => {
		expect(getPlainText(prayer)).toBe(
			"Lord\nGive me wisdom and patience.\nRest",
		);
	});

	it("can leave headings out", () => {
		expect(getPlainText(prayer, { skipHeadings: true })).toBe(
			"Give me wisdom and patience.\nRest",
		);
	});

	it("returns short text unchanged on one line", () => {
		expect(getExcerpt(prayer)).toBe("Lord Give me wisdom and patience. Rest");
	});

	it("cuts long text at a word boundary and adds an ellipsis", () => {
		expect(getExcerpt(prayer, 20)).toBe("Lord Give me wisdom…");
	});

	it("returns an empty string for an empty document", () => {
		expect(getExcerpt({ type: "doc" })).toBe("");
	});

	it("splits a document into the text under each heading", () => {
		const testimony = createTestimonyTemplate();
		testimony.content?.splice(1, 1, {
			content: [{ text: "The car broke down.", type: "text" }],
			type: "paragraph",
		});

		expect(getDocumentSectionTexts(testimony)).toEqual([
			{ heading: "What happened?", text: "The car broke down." },
			{ heading: "What did you learn?", text: "" },
			{ heading: "Where did you see His faithfulness?", text: "" },
		]);
	});
});

describe("document templates", () => {
	it("starts a testimony with three headings, each followed by a hinted empty line", () => {
		const template = createTestimonyTemplate();

		expect(template.content?.map((node) => node.type)).toEqual([
			"heading",
			"paragraph",
			"heading",
			"paragraph",
			"heading",
			"paragraph",
		]);
		expect(template.content?.[1]?.attrs?.prompt).toBe(
			"Describe the situation in a few sentences…",
		);
		expect(getPlainText(template)).toBe(
			"What happened?\nWhat did you learn?\nWhere did you see His faithfulness?",
		);
	});

	it("starts a reflection with the guiding question as a heading", () => {
		const template = createReflectionTemplate("What has changed?");

		expect(template.content?.[0]).toMatchObject({
			attrs: { level: 2 },
			content: [{ text: "What has changed?" }],
			type: "heading",
		});
	});

	it("shows a template hint only while its line is empty", () => {
		const editor = createEditor(createReflectionTemplate("What has changed?"));
		const hint = () => editor.view.dom.querySelector("p.is-prompt-empty");

		expect(hint()?.getAttribute("data-prompt")).toBe("Keep writing…");

		editor.commands.insertContentAt(editor.state.doc.content.size - 1, "Peace");
		expect(hint()).toBeNull();
	});

	it("doesn't copy a hint onto the new line made by Enter", () => {
		const editor = createEditor(createReflectionTemplate("What has changed?"));
		editor.commands.insertContentAt(editor.state.doc.content.size - 1, "Peace");
		editor.commands.setTextSelection(editor.state.doc.content.size - 1);
		editor.commands.splitBlock();

		expect(editor.getJSON().content?.at(-1)?.attrs?.prompt).toBeUndefined();
	});

	it("inserts a person's name as plain text", () => {
		const editor = createEditor({
			content: [
				{ content: [{ text: "Pray for ", type: "text" }], type: "paragraph" },
			],
			type: "doc",
		});
		editor.commands.setTextSelection(editor.state.doc.content.size - 1);

		expect(createEditorSession(editor).insertText?.("Sipho")).toBe(true);
		expect(getPlainText(editor.getJSON())).toBe("Pray for Sipho");
	});
});
