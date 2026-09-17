import { Editor, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import {
	getDocumentBibleReferences,
	getDocumentCitations,
	getDocumentReferences,
} from "../src/bible-reference-utils";
import { createRichTextExtensions } from "../src/editor-extensions";
import { sanitizePastedHtml } from "../src/paste-sanitization";
import type { RichTextEditorPreset } from "../src/types";

const editors: Editor[] = [];

function createEditor(
	content: string | JSONContent = "<p>Testing</p>",
	preset: RichTextEditorPreset = "member",
) {
	const editor = new Editor({
		content,
		element: document.createElement("div"),
		extensions: createRichTextExtensions("Start writing…", preset),
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

	it("inserts, serializes, deserializes, and deletes Bible references", () => {
		const editor = createEditor();
		const reference = { label: "Romans 8:1", passageId: 123 };
		expect(editor.commands.insertBibleReference(reference)).toBe(true);

		const document = editor.getJSON();
		expect(document.content?.[0]?.content).toContainEqual(
			expect.objectContaining({
				attrs: reference,
				type: "bibleReference",
			}),
		);
		expect(
			getDocumentBibleReferences(document as JSONContent & { type: "doc" }),
		).toEqual([reference]);

		const restored = createEditor(document);
		expect(restored.getJSON()).toEqual(document);
		restored.commands.selectAll();
		expect(restored.commands.deleteSelection()).toBe(true);
		expect(
			getDocumentBibleReferences(
				restored.getJSON() as JSONContent & { type: "doc" },
			),
		).toEqual([]);
	});

	it("renders Bible references in a read-only editor", () => {
		const editor = new Editor({
			content: {
				content: [
					{
						content: [
							{
								attrs: { label: "John 3:16", passageId: 316 },
								type: "bibleReference",
							},
						],
						type: "paragraph",
					},
				],
				type: "doc",
			},
			editable: false,
			element: document.createElement("div"),
			extensions: createRichTextExtensions(),
		});
		editors.push(editor);
		expect(editor.isEditable).toBe(false);
		expect(editor.getHTML()).toContain('data-bible-reference="true"');
		expect(editor.getHTML()).toContain("John 3:16");
	});

	it("rejects invalid Bible reference data and ignores it during extraction", () => {
		const editor = createEditor();
		expect(
			editor.commands.insertBibleReference({ label: "", passageId: 0 }),
		).toBe(false);
		expect(
			getDocumentBibleReferences({
				content: [
					{
						content: [
							{
								attrs: { label: "", passageId: "wrong" },
								type: "bibleReference",
							},
						],
						type: "paragraph",
					},
				],
				type: "doc",
			}),
		).toEqual([]);
	});

	it("limits citations to the contributor preset", () => {
		const member = createEditor();
		const contributor = createEditor("<p>Testing</p>", "contributor");
		expect(
			member.extensionManager.extensions.some(
				(extension) => extension.name === "citation",
			),
		).toBe(false);
		expect(
			contributor.extensionManager.extensions.some(
				(extension) => extension.name === "citation",
			),
		).toBe(true);
		expect(member.commands.insertCitation).toBeUndefined();
		expect(contributor.commands.insertCitation).toBeTypeOf("function");
	});

	it("inserts, serializes, deserializes, and deletes citations", () => {
		const editor = createEditor("<p>Testing</p>", "contributor");
		const citation = { citationId: 481, label: "1" };
		expect(editor.commands.insertCitation(citation)).toBe(true);

		const document = editor.getJSON();
		expect(document.content?.[0]?.content).toContainEqual(
			expect.objectContaining({ attrs: citation, type: "citation" }),
		);
		expect(
			getDocumentCitations(document as JSONContent & { type: "doc" }),
		).toEqual([citation]);
		expect(
			getDocumentReferences(document as JSONContent & { type: "doc" }),
		).toEqual({ bibleReferences: [], citations: [citation] });

		const restored = createEditor(document, "contributor");
		expect(restored.getJSON()).toEqual(document);
		restored.commands.selectAll();
		expect(restored.commands.deleteSelection()).toBe(true);
		expect(
			getDocumentCitations(restored.getJSON() as JSONContent & { type: "doc" }),
		).toEqual([]);
	});

	it("renders citations in a read-only contributor editor and rejects invalid data", () => {
		const editor = new Editor({
			content: {
				content: [
					{
						content: [
							{ attrs: { citationId: 481, label: "1" }, type: "citation" },
						],
						type: "paragraph",
					},
				],
				type: "doc",
			},
			editable: false,
			element: document.createElement("div"),
			extensions: createRichTextExtensions("Start writing…", "contributor"),
		});
		editors.push(editor);
		expect(editor.getHTML()).toContain('data-citation="true"');
		expect(editor.getHTML()).toContain("[1]");
		expect(editor.commands.insertCitation({ citationId: 0, label: "" })).toBe(
			false,
		);
	});
});
