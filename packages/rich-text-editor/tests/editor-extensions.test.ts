import { Editor, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { createRichTextExtensions } from "../src/editor-extensions";
import { sanitizePastedHtml } from "../src/paste-sanitization";

const editors: Editor[] = [];

function createEditor(content: string | JSONContent = "<p>Testing</p>") {
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

describe("Berean rich-text schema", () => {
	it("supports H2 and H3 but rejects H1", () => {
		const editor = createEditor();
		expect(editor.commands.toggleHeading({ level: 2 })).toBe(true);
		expect(editor.getJSON().content?.[0]?.attrs?.level).toBe(2);
		expect(editor.commands.toggleHeading({ level: 3 })).toBe(true);
		expect(editor.getJSON().content?.[0]?.attrs?.level).toBe(3);
		expect(editor.commands.toggleHeading({ level: 1 })).toBe(false);
	});

	it("supports the approved inline marks", () => {
		const editor = createEditor();
		editor.commands.selectAll();
		for (const command of [
			"toggleBold",
			"toggleItalic",
			"toggleUnderline",
			"toggleStrike",
		] as const) {
			expect(editor.commands[command]()).toBe(true);
		}
		const marks = editor
			.getJSON()
			.content?.[0]?.content?.[0]?.marks?.map((mark) => mark.type);
		expect(marks).toEqual(
			expect.arrayContaining(["bold", "italic", "underline", "strike"]),
		);
	});

	it("sets and removes safe links", () => {
		const editor = createEditor();
		editor.commands.selectAll();
		expect(editor.commands.setLink({ href: "https://berean.study" })).toBe(
			true,
		);
		expect(editor.isActive("link")).toBe(true);
		expect(editor.commands.unsetLink()).toBe(true);
		expect(editor.isActive("link")).toBe(false);
	});

	it("supports alignment, lists, quotes, dividers, undo, and redo", () => {
		const editor = createEditor();
		expect(editor.commands.setTextAlign("center")).toBe(true);
		expect(editor.getJSON().content?.[0]?.attrs?.textAlign).toBe("center");
		expect(editor.commands.toggleBulletList()).toBe(true);
		expect(editor.isActive("bulletList")).toBe(true);
		editor.commands.setContent("<p>Testing</p>");
		expect(editor.commands.toggleOrderedList()).toBe(true);
		expect(editor.isActive("orderedList")).toBe(true);
		editor.commands.setContent("<p>Testing</p>");
		expect(editor.commands.toggleBlockquote()).toBe(true);
		expect(editor.isActive("blockquote")).toBe(true);
		editor.commands.setContent("<p>Testing</p>");
		expect(editor.commands.setHorizontalRule()).toBe(true);
		expect(
			editor.getJSON().content?.some((node) => node.type === "horizontalRule"),
		).toBe(true);

		const historyEditor = createEditor();
		historyEditor.commands.selectAll();
		expect(historyEditor.commands.toggleBold()).toBe(true);
		expect(historyEditor.can().undo()).toBe(true);
		expect(historyEditor.commands.undo()).toBe(true);
		expect(historyEditor.commands.redo()).toBe(true);
	});

	it("round-trips the structured JSON document", () => {
		const source = createEditor({
			content: [
				{
					attrs: { level: 2 },
					content: [{ text: "Context", type: "text" }],
					type: "heading",
				},
				{
					attrs: { textAlign: "right" },
					content: [
						{ marks: [{ type: "bold" }], text: "Conclusion", type: "text" },
					],
					type: "paragraph",
				},
			],
			type: "doc",
		});
		const document = source.getJSON();
		const restored = createEditor(document);
		expect(restored.getJSON()).toEqual(document);
	});

	it("supports constrained writing tables", () => {
		const editor = createEditor();
		expect(
			editor.commands.insertTable({ cols: 2, rows: 2, withHeaderRow: true }),
		).toBe(true);
		expect(editor.isActive("table")).toBe(true);
		expect(editor.commands.addRowAfter()).toBe(true);
		expect(editor.commands.deleteRow()).toBe(true);
		expect(editor.commands.addColumnAfter()).toBe(true);
		expect(editor.commands.deleteColumn()).toBe(true);
		expect(editor.commands.toggleHeaderRow()).toBe(true);
		expect(editor.commands.toggleHeaderColumn()).toBe(true);
		expect(editor.commands.deleteTable()).toBe(true);
		expect(editor.isActive("table")).toBe(false);
	});

	it("sanitizes unsupported paste styling and normalizes H1 to H2", () => {
		const html = sanitizePastedHtml(
			'<h1 style="color:red">Title</h1><p style="font-size:20px">Body <span style="background:yellow"><strong>text</strong></span><script>alert(1)</script></p><a href="javascript:alert(1)" onclick="x()">unsafe</a>',
		);
		expect(html).toContain("<h2>Title</h2>");
		expect(html).not.toContain("h1");
		expect(html).not.toContain("style=");
		expect(html).not.toContain("script");
		expect(html).not.toContain("onclick");
		expect(html).toContain("<strong>text</strong>");

		const editor = createEditor(html);
		expect(editor.getJSON().content?.[0]?.type).toBe("heading");
		expect(editor.getJSON().content?.[0]?.attrs?.level).toBe(2);
	});
});
