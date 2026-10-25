import { Editor, type JSONContent } from "@tiptap/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRichTextExtensions } from "../src/editor-extensions";
import { createEditorSession } from "../src/editor-session";
import { PassageMentionMenu } from "../src/passage-mention-menu";
import {
	getPassageMentionState,
	passageMentionPluginKey,
} from "../src/passage-mentions";
import type { BibleReferenceAttributes } from "../src/types";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const getTestRect = () => new DOMRect(0, 0, 0, 0);
Object.defineProperties(Range.prototype, {
	getBoundingClientRect: { configurable: true, value: getTestRect },
	getClientRects: { configurable: true, value: () => [getTestRect()] },
});

const editors: Editor[] = [];
const mounted: Root[] = [];

afterEach(() => {
	for (const root of mounted.splice(0)) act(() => root.unmount());
	for (const editor of editors.splice(0)) editor.destroy();
});

/** An editor whose cursor sits at the end of the given content. */
function createEditor(content: string | JSONContent) {
	const editor = new Editor({
		content,
		element: document.createElement("div"),
		extensions: createRichTextExtensions("Start writing…"),
	});
	editors.push(editor);
	editor.commands.setTextSelection(editor.state.doc.content.size - 1);
	return { editor, session: createEditorSession(editor) };
}

/** Builds the paragraph as JSON, since HTML would collapse its spaces. */
const paragraph = (text: string): JSONContent => ({
	content: [{ content: [{ text, type: "text" }], type: "paragraph" }],
	type: "doc",
});

const mentionOf = (editor: Editor) =>
	passageMentionPluginKey.getState(editor.state)?.mention ?? null;

describe("passage mentions", () => {
	it("reads the reference typed after @", () => {
		expect(
			getPassageMentionState(
				createEditor("<p>Read @acts 17:11</p>").editor.state,
			),
		).toMatchObject({ query: "acts 17:11" });
		// A trailing space is allowed so "@Romans 8 " can grow to "@Romans 8 :28".
		expect(
			getPassageMentionState(
				createEditor(paragraph("@Romans 8 ")).editor.state,
			),
		).toMatchObject({ from: 1, query: "Romans 8 " });
	});

	it("ignores email addresses, double spaces and code", () => {
		for (const content of [
			"<p>me@example.test</p>",
			paragraph("@acts  17"),
			"<pre><code>@acts 17</code></pre>",
		])
			expect(getPassageMentionState(createEditor(content).editor.state)).toBe(
				null,
			);
	});

	it("replaces the typed reference with a passage reference", () => {
		const { editor, session } = createEditor("<p>See @acts 17</p>");
		const mention = mentionOf(editor);
		if (!mention) throw new Error("Expected a mention.");

		session.completePassageMention(mention.from, {
			label: "Acts 17:10–12",
			passageId: 12,
		});

		expect(editor.getJSON().content?.[0]?.content).toEqual([
			{ text: "See ", type: "text" },
			{
				attrs: { label: "Acts 17:10–12", passageId: 12 },
				type: "bibleReference",
			},
			{ text: " ", type: "text" },
		]);
		expect(mentionOf(editor)).toBe(null);
	});

	it("stays closed after Escape until a new @ is typed", () => {
		const { editor, session } = createEditor("<p>@acts</p>");
		session.dismissPassageMention();
		expect(mentionOf(editor)).toBe(null);

		editor.commands.insertContent(" 17");
		expect(mentionOf(editor)).toBe(null);

		editor.commands.insertContent(" and @rom");
		expect(mentionOf(editor)).toMatchObject({ query: "rom" });
	});

	it("offers matching passages and links the one chosen with Enter", async () => {
		const { editor, session } = createEditor("<p>@acts</p>");
		const onLink = vi.fn();
		const passages: BibleReferenceAttributes[] = [
			{ label: "Acts 2:42–47", passageId: 4 },
			{ label: "Acts 17:10–12", passageId: 12 },
		];
		const search = vi.fn((query: string) =>
			passages.filter((passage) =>
				passage.label.toLowerCase().includes(query.toLowerCase()),
			),
		);
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		mounted.push(root);
		await act(async () =>
			root.render(
				<PassageMentionMenu session={session} source={{ onLink, search }} />,
			),
		);

		const options = [...container.querySelectorAll('[role="option"]')];
		expect(options.map((option) => option.textContent)).toEqual([
			"Acts 2:42–47",
			"Acts 17:10–12",
		]);

		const press = (key: string) =>
			act(async () => {
				editor.view.dom.dispatchEvent(
					new KeyboardEvent("keydown", {
						bubbles: true,
						cancelable: true,
						key,
					}),
				);
			});
		await press("ArrowDown");
		await press("Enter");

		expect(onLink).toHaveBeenCalledWith(passages[1]);
		const json: JSONContent = editor.getJSON();
		expect(json.content?.[0]?.content?.[0]?.attrs?.passageId).toBe(12);
		expect(container.querySelector('[role="listbox"]')).toBe(null);
	});
});
