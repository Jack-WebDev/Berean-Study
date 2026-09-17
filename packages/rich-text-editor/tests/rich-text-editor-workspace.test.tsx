import type { Editor } from "@tiptap/core";
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { getDocumentReferences } from "../src/bible-reference-utils";
import { RichTextEditorWorkspace } from "../src/rich-text-editor-workspace";
import type { RichTextDocument } from "../src/types";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const getTestRect = () => new DOMRect(0, 0, 0, 0);
const testRectMethods = {
	getBoundingClientRect: {
		value: getTestRect,
	},
	getClientRects: {
		value: () => [getTestRect()],
	},
};
Object.defineProperties(Node.prototype, testRectMethods);
Object.defineProperties(Range.prototype, testRectMethods);

const emptyDocument: RichTextDocument = {
	content: [{ type: "paragraph" }],
	type: "doc",
};

const mounted: { container: HTMLDivElement; root: Root }[] = [];

afterEach(() => {
	for (const { container, root } of mounted.splice(0)) {
		act(() => root.unmount());
		container.remove();
	}
});

describe("RichTextEditorWorkspace", () => {
	it("uses accessible tabs and respects preset capabilities", async () => {
		const { container } = await mount({ preset: "member" });

		expect(tab(container, "Insert").getAttribute("aria-selected")).toBe("true");
		expect(button(container, "Table")).toBeTruthy();
		expect(button(container, "Divider")).toBeTruthy();
		expect(button(container, "Bible Passage")).toBeUndefined();
		expect(button(container, "Citation")).toBeUndefined();

		await click(tab(container, "Document"));
		expect(tab(container, "Document").getAttribute("aria-selected")).toBe(
			"true",
		);

		const contributor = await mount({
			onRequestBibleReference: () => ({ label: "John 3:16", passageId: 316 }),
			onRequestCitation: () => ({ citationId: 1, label: "1" }),
			preset: "contributor",
		});
		expect(button(contributor.container, "Bible Passage")).toBeTruthy();
		expect(button(contributor.container, "Citation")).toBeTruthy();
	});

	it("routes insert actions through the shared editor command path", async () => {
		let bibleRequests = 0;
		const { container, getEditor } = await mount({
			onRequestBibleReference: () => {
				bibleRequests += 1;
				return { label: "Romans 8:1", passageId: 801 };
			},
			preset: "contributor",
		});

		await click(button(container, "Table") as HTMLButtonElement);
		expect(getEditor().getJSON().content?.[0]?.type).toBe("table");

		await act(async () => {
			getEditor().commands.setContent(emptyDocument);
		});
		await click(button(container, "Bible Passage") as HTMLButtonElement);
		expect(bibleRequests).toBe(1);
		expect(
			getDocumentReferences(getEditor().getJSON() as RichTextDocument)
				.bibleReferences,
		).toEqual([{ label: "Romans 8:1", passageId: 801 }]);
	});

	it("derives outline, statistics, and references from the live document", async () => {
		const document: RichTextDocument = {
			content: [
				{
					attrs: { level: 2 },
					content: [{ text: "Context", type: "text" }],
					type: "heading",
				},
				{
					content: [
						{
							attrs: { label: "John 3:16", passageId: 316 },
							type: "bibleReference",
						},
					],
					type: "paragraph",
				},
				{
					content: [
						{
							attrs: { citationId: 1, label: "1" },
							type: "citation",
						},
					],
					type: "paragraph",
				},
			],
			type: "doc",
		};
		const { container, getEditor } = await mount({
			document,
			onRequestCitation: () => ({ citationId: 1, label: "1" }),
			preset: "contributor",
		});

		await click(tab(container, "Document"));
		expect(container.textContent).toContain("Context");
		expect(container.textContent).toContain("Words");
		expect(container.textContent).toContain("Characters");
		await click(button(container, "Context") as HTMLButtonElement);
		expect(getEditor().state.selection.$from.parent.type.name).toBe("heading");

		await act(async () => {
			getEditor().commands.setContent({
				content: [
					...(document.content ?? []),
					{
						attrs: { level: 3 },
						content: [{ text: "Application", type: "text" }],
						type: "heading",
					},
				],
				type: "doc",
			});
		});
		expect(container.textContent).toContain("Application");

		await click(tab(container, "References"));
		expect(container.textContent).toContain("John 3:16");
		await click(button(container, "John 3:16") as HTMLButtonElement);
		expect(getEditor().state.selection.$from.parent.type.name).toBe(
			"paragraph",
		);
		await click(button(container, "Remove John 3:16") as HTMLButtonElement);
		expect(
			getDocumentReferences(getEditor().getJSON() as RichTextDocument)
				.bibleReferences,
		).toEqual([]);
		await click(button(container, "[1]") as HTMLButtonElement);
		expect(getEditor().state.selection.$from.parent.type.name).toBe(
			"paragraph",
		);
		await click(button(container, "Remove [1]") as HTMLButtonElement);
		expect(
			getDocumentReferences(getEditor().getJSON() as RichTextDocument)
				.citations,
		).toEqual([]);
	});
});

async function mount({
	document = emptyDocument,
	...props
}: Partial<ComponentProps<typeof RichTextEditorWorkspace>> & {
	document?: RichTextDocument;
}) {
	const container = window.document.createElement("div");
	window.document.body.append(container);
	const root = createRoot(container);
	mounted.push({ container, root });
	let editor: Editor | null = null;

	await act(async () => {
		root.render(
			<RichTextEditorWorkspace
				{...props}
				onChange={() => undefined}
				onEditorReady={(nextEditor) => {
					if (nextEditor) editor = nextEditor;
				}}
				value={document}
			/>,
		);
	});

	return {
		container,
		getEditor: () => {
			if (!editor) throw new Error("Editor did not initialize.");
			return editor;
		},
	};
}

async function click(element: Element) {
	await act(async () =>
		element.dispatchEvent(new MouseEvent("click", { bubbles: true })),
	);
}

function button(container: ParentNode, label: string) {
	return [...container.querySelectorAll("button")].find(
		(element) =>
			element.textContent?.includes(label) ||
			element.getAttribute("aria-label") === label,
	);
}

function tab(container: ParentNode, label: string) {
	const element = [...container.querySelectorAll('[role="tab"]')].find(
		(tabElement) => tabElement.textContent?.trim() === label,
	);
	if (!element) throw new Error(`Unable to find ${label} tab.`);
	return element;
}
