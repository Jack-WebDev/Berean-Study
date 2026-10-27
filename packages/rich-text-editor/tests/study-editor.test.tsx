import { Editor, type JSONContent } from "@tiptap/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { createRichTextExtensions } from "../src/editor-extensions";
import {
	createEditorSession,
	type EditorSession,
	getActiveSectionIndex,
} from "../src/editor-session";
import { RichTextEditor } from "../src/rich-text-editor";
import type { RichTextDocument, VerseBlockAttributes } from "../src/types";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const getTestRect = () => new DOMRect(0, 0, 0, 0);
Object.defineProperties(Node.prototype, {
	getBoundingClientRect: { configurable: true, value: getTestRect },
	getClientRects: { configurable: true, value: () => [getTestRect()] },
});
Object.defineProperties(Range.prototype, {
	getBoundingClientRect: { configurable: true, value: getTestRect },
	getClientRects: { configurable: true, value: () => [getTestRect()] },
});
Element.prototype.scrollIntoView = () => undefined;

const verse: VerseBlockAttributes = {
	book: "Acts",
	bookId: 44,
	chapter: 17,
	passageId: 12,
	translation: "KJV",
	verseEnd: 11,
	verseStart: 11,
};

const editors: Editor[] = [];
const mounted: { container: HTMLDivElement; root: Root }[] = [];

afterEach(() => {
	for (const editor of editors.splice(0)) editor.destroy();
	for (const { container, root } of mounted.splice(0)) {
		act(() => root.unmount());
		container.remove();
	}
});

function createEditor(content: string | JSONContent = "<p></p>") {
	const editor = new Editor({
		content,
		element: document.createElement("div"),
		extensions: createRichTextExtensions("Start writing…"),
	});
	editors.push(editor);
	return { editor, session: createEditorSession(editor) };
}

describe("study editing operations", () => {
	it("fills an empty note with template sections and starts under the first", () => {
		const { editor, session } = createEditor();

		session.insertSections([
			{ text: "Observe", variant: "observe" },
			{ text: "Apply", variant: "apply" },
		]);

		expect(editor.getJSON().content).toEqual([
			{
				attrs: { level: 2, textAlign: null, variant: "observe" },
				content: [{ text: "Observe", type: "text" }],
				type: "heading",
			},
			{ attrs: { textAlign: null }, type: "paragraph" },
			{
				attrs: { level: 2, textAlign: null, variant: "apply" },
				content: [{ text: "Apply", type: "text" }],
				type: "heading",
			},
			{ attrs: { textAlign: null }, type: "paragraph" },
		]);
		expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
		expect(editor.state.selection.$from.index(0)).toBe(1);
		expect(getActiveSectionIndex(editor)).toBe(0);
	});

	it("appends sections after existing writing", () => {
		const { editor, session } = createEditor("<p>Already writing</p>");

		session.insertSections([{ text: "Observe", variant: "observe" }]);

		expect(editor.state.doc.child(0).textContent).toBe("Already writing");
		expect(editor.getJSON().content?.[1]?.attrs?.variant).toBe("observe");
		expect(editor.state.selection.$from.index(0)).toBe(2);
	});

	it("adds a section at the end with its text selected", () => {
		const { editor, session } = createEditor("<p>Intro</p>");

		session.appendSection();

		const { from, to } = editor.state.selection;
		expect(editor.state.doc.textBetween(from, to)).toBe("New section");
		expect(getActiveSectionIndex(editor)).toBe(0);
	});

	it("moves the cursor to a section and reports where it is", () => {
		const { editor, session } = createEditor(
			'<p>Intro</p><h2 data-variant="observe">Observe</h2><p>One</p><h2>Plain</h2><p>Two</p>',
		);
		editor.commands.setTextSelection(1);
		expect(getActiveSectionIndex(editor)).toBeNull();

		expect(session.focusSection(1)).toBe(true);
		expect(editor.state.selection.$from.parent.textContent).toBe("Plain");
		expect(getActiveSectionIndex(editor)).toBe(1);
		expect(session.focusSection(5)).toBe(false);
	});

	it("inserts verse blocks as structured references", () => {
		const { editor, session } = createEditor("<p>Text</p>");

		expect(session.insertVerseBlock(verse)).toBe(true);
		expect(
			editor.getJSON().content?.find((node) => node.type === "verseBlock")
				?.attrs,
		).toEqual(verse);
		expect(session.insertVerseBlock({ ...verse, verseStart: 0 })).toBe(false);
	});

	it("round-trips verse blocks and section variants through HTML", () => {
		const { editor } = createEditor({
			content: [
				{ attrs: { level: 2, variant: "interpret" }, type: "heading" },
				{ attrs: verse, type: "verseBlock" },
			],
			type: "doc",
		});
		const { editor: copy } = createEditor(editor.getHTML());

		expect(copy.getJSON().content?.[0]?.attrs?.variant).toBe("interpret");
		expect(copy.getJSON().content?.[1]?.attrs).toEqual(verse);
	});

	it("supports checklists, highlight and inline code", () => {
		const { editor, session } = createEditor("<p>Task</p>");
		editor.commands.setTextSelection(2);

		session.applyCommand("checklist");
		expect(editor.isActive("taskList")).toBe(true);
		editor.commands.setTextSelection({ from: 3, to: 5 });
		session.toggleMark("highlight");
		expect(editor.isActive("highlight")).toBe(true);
		session.toggleMark("code");
		expect(editor.isActive("code")).toBe(true);
	});
});

describe("formatting toolbar", () => {
	it("offers the Verse action only when the host provides a picker", async () => {
		const plain = await mount({});
		expect(button(plain.container, "Verse")).toBeUndefined();

		let requests = 0;
		const withVerse = await mount({
			onRequestVerse: () => {
				requests += 1;
				return verse;
			},
		});
		await click(button(withVerse.container, "Verse"));

		expect(requests).toBe(1);
		expect(
			withVerse
				.getSession()
				.getDocument()
				.content?.some((node) => node.type === "verseBlock"),
		).toBe(true);
	});

	it("is a single tab stop navigated with arrow keys", async () => {
		const { container } = await mount({});
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		const items = [
			...toolbar.querySelectorAll<HTMLElement>("[data-toolbar-item]"),
		].filter((item) => !(item as HTMLButtonElement).disabled);

		expect(items.filter((item) => item.tabIndex === 0)).toHaveLength(1);

		await act(async () => items[0]?.focus());
		await keyDown(items[0], "ArrowRight");
		expect(window.document.activeElement).toBe(items[1]);
		expect(items[1]?.tabIndex).toBe(0);
		expect(items[0]?.tabIndex).toBe(-1);

		await keyDown(items[1], "End");
		expect(window.document.activeElement).toBe(items.at(-1));
		await keyDown(items.at(-1), "ArrowRight");
		expect(window.document.activeElement).toBe(items[0]);
	});

	it("keeps the simple toolbar to everyday formatting", async () => {
		const { container } = await mount({
			onRequestVerse: () => verse,
			toolbar: "simple",
		});

		for (const label of ["Bold", "Highlight", "Quote", "Link", "Undo"])
			expect(button(container, label)).toBeDefined();
		expect(button(container, "Insert verse")).toBeDefined();
		expect(button(container, "More formatting")).toBeUndefined();
		expect(button(container, "Checklist")).toBeUndefined();
	});

	it("offers the full-screen editor from the compact toolbar", async () => {
		let expanded = 0;
		const { container } = await mount({
			onExpand: () => {
				expanded += 1;
			},
			toolbar: "compact",
		});

		expect(button(container, "Undo")).toBeUndefined();
		await click(button(container, "Open full-screen editor"));
		expect(expanded).toBe(1);
	});

	it("docks four labelled buttons below the writing by default", async () => {
		const { container } = await mount({
			onRequestVerse: () => verse,
			toolbar: "docked",
		});
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		const labels = [...toolbar.querySelectorAll("button")].map((item) =>
			item.textContent?.trim(),
		);

		expect(labels).toEqual(["Bold", "Italic", "List", "Add a verse"]);
		// The toolbar comes after the writing, not between title and text.
		const writing = container.querySelector(".ProseMirror") as HTMLElement;
		expect(
			writing.compareDocumentPosition(toolbar) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("shows Bold and List as pressed while the cursor is in them", async () => {
		const { container, getSession } = await mount({
			document: {
				content: [
					{
						content: [
							{ text: "Plain ", type: "text" },
							{ marks: [{ type: "bold" }], text: "Strong", type: "text" },
						],
						type: "paragraph",
					},
				],
				type: "doc",
			},
			toolbar: "docked",
		});
		const pressed = (label: string) =>
			button(container, label)?.getAttribute("aria-pressed");
		const editor = (
			container.querySelector(".ProseMirror") as HTMLElement & {
				editor: Editor;
			}
		).editor;

		await act(async () => {
			editor.commands.setTextSelection(2);
		});
		expect(pressed("Bold")).toBe("false");
		expect(pressed("List")).toBe("false");
		await act(async () => {
			editor.commands.setTextSelection(10);
			getSession().applyCommand("bullet");
		});
		expect(pressed("Bold")).toBe("true");
		expect(pressed("List")).toBe("true");
		expect(pressed("Italic")).toBe("false");

		await click(button(container, "Italic"));
		expect(pressed("Italic")).toBe("true");
	});

	it("inserts a verse from the Add a verse button and lets hosts choose buttons", async () => {
		const { container, getSession } = await mount({
			onRequestVerse: () => verse,
			toolbar: "docked",
			toolbarItems: ["bold", "undo", "verse"],
		});

		expect(button(container, "Italic")).toBeUndefined();
		expect(button(container, "Undo")?.hasAttribute("aria-pressed")).toBe(false);
		await click(button(container, "Add a verse"));
		expect(
			getSession()
				.getDocument()
				.content?.some((node) => node.type === "verseBlock"),
		).toBe(true);
	});

	it("leaves Add a verse out when the host has no verse picker", async () => {
		const { container } = await mount({ toolbar: "docked" });
		expect(button(container, "Add a verse")).toBeUndefined();
	});

	it("shows the empty state until the note has content", async () => {
		const emptyState = <p>Pick a structure</p>;
		const empty = await mount({ emptyState });
		expect(empty.container.textContent).toContain("Pick a structure");

		const written = await mount({
			document: {
				content: [
					{ content: [{ text: "Hi", type: "text" }], type: "paragraph" },
				],
				type: "doc",
			},
			emptyState,
		});
		expect(written.container.textContent).not.toContain("Pick a structure");
	});
});

async function mount({
	document = { content: [{ type: "paragraph" }], type: "doc" },
	...props
}: Partial<Parameters<typeof RichTextEditor>[0]> & {
	document?: RichTextDocument;
}) {
	const container = window.document.createElement("div");
	window.document.body.append(container);
	const root = createRoot(container);
	mounted.push({ container, root });
	let session: EditorSession | null = null;

	await act(async () => {
		root.render(
			<RichTextEditor
				{...props}
				onChange={() => undefined}
				onSessionReady={(nextSession) => {
					if (nextSession) session = nextSession;
				}}
				value={document}
			/>,
		);
	});

	return {
		container,
		getSession: () => {
			if (!session) throw new Error("Editor session did not initialize.");
			return session as EditorSession;
		},
	};
}

function button(container: ParentNode, label: string) {
	return [...container.querySelectorAll("button")].find(
		(element) =>
			element.textContent?.trim() === label ||
			element.getAttribute("aria-label") === label,
	);
}

async function click(element: Element | undefined) {
	if (!element) throw new Error("Missing element.");
	await act(async () =>
		element.dispatchEvent(new MouseEvent("click", { bubbles: true })),
	);
}

async function keyDown(element: Element | undefined, key: string) {
	if (!element) throw new Error("Missing element.");
	await act(async () =>
		element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key })),
	);
}
