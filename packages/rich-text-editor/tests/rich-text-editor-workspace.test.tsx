import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { getDocumentReferences } from "../src/bible-reference-utils";
import type { EditorSession } from "../src/editor-session";
import { RichTextEditor } from "../src/rich-text-editor";
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

let wideViewport = true;
const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>();
Object.defineProperty(window, "matchMedia", {
	value: () => ({
		addEventListener: (
			event: string,
			listener: (event: MediaQueryListEvent) => void,
		) => {
			if (event === "change") mediaQueryListeners.add(listener);
		},
		dispatchEvent: () => true,
		matches: wideViewport,
		media: "",
		onchange: null,
		removeEventListener: (
			event: string,
			listener: (event: MediaQueryListEvent) => void,
		) => {
			if (event === "change") mediaQueryListeners.delete(listener);
		},
	}),
	writable: true,
});

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
	setWideViewport(true);
});

describe("RichTextEditorWorkspace", () => {
	it("keeps the reusable editor free of workspace chrome", async () => {
		const container = window.document.createElement("div");
		window.document.body.append(container);
		const root = createRoot(container);
		mounted.push({ container, root });

		await act(async () => {
			root.render(
				<RichTextEditor onChange={() => undefined} value={emptyDocument} />,
			);
		});

		expect(button(container, "Focus editor")).toBeUndefined();
		expect(container.textContent).not.toContain("Writing tools");
	});

	it("uses accessible tabs and respects preset capabilities", async () => {
		const { container } = await mount({
			preset: "member",
			slots: {
				inspector: {
					details: <span>Host details</span>,
					organization: <span>Host organization</span>,
					tags: <span>Host tags</span>,
				},
			},
		});

		expect(tab(container, "Insert").getAttribute("aria-selected")).toBe("true");
		expect(button(container, "Table")).toBeTruthy();
		expect(button(container, "Divider")).toBeTruthy();
		expect(button(container, "Bible reference")).toBeUndefined();
		expect(button(container, "Citation")).toBeUndefined();

		await click(tab(container, "Document"));
		expect(tab(container, "Document").getAttribute("aria-selected")).toBe(
			"true",
		);
		expect(container.textContent).toContain("Host tags");
		expect(container.textContent).toContain("Host organization");
		expect(container.textContent).toContain("Host details");

		const contributor = await mount({
			onRequestBibleReference: () => ({ label: "John 3:16", passageId: 316 }),
			onRequestCitation: () => ({ citationId: 1, label: "1" }),
			preset: "contributor",
		});
		expect(button(contributor.container, "Bible reference")).toBeTruthy();
		expect(button(contributor.container, "Citation")).toBeTruthy();
	});

	it("opens labelled toolbar menu groups", async () => {
		const { container } = await mount({});

		await click(button(container, "Insert content") as HTMLButtonElement);
		expect(window.document.body.textContent).toContain(
			"Bring something into your writing",
		);

		await click(button(container, "More writing tools") as HTMLButtonElement);
		expect(window.document.body.textContent).toContain("Paragraph alignment");
	});

	it("routes insert actions through the shared editor command path", async () => {
		let bibleRequests = 0;
		const { container, getSession } = await mount({
			onRequestBibleReference: () => {
				bibleRequests += 1;
				return { label: "Romans 8:1", passageId: 801 };
			},
			preset: "contributor",
		});

		await click(button(container, "Table") as HTMLButtonElement);
		expect(getSession().getDocument().content?.[0]?.type).toBe("table");

		const bible = await mount({
			onRequestBibleReference: () => {
				bibleRequests += 1;
				return { label: "Romans 8:1", passageId: 801 };
			},
			preset: "contributor",
		});
		await click(
			button(bible.container, "Bible reference") as HTMLButtonElement,
		);
		expect(bibleRequests).toBe(1);
		expect(
			getDocumentReferences(bible.getSession().getDocument()).bibleReferences,
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
		const { container, getSession } = await mount({
			document,
			onRequestCitation: () => ({ citationId: 1, label: "1" }),
			preset: "contributor",
		});

		await click(tab(container, "Document"));
		expect(container.textContent).toContain("Context");
		expect(container.textContent).toContain("Words");
		expect(container.textContent).toContain("Characters");
		await click(button(container, "Context") as HTMLButtonElement);
		expect(getSession().isSelectionInNode("heading")).toBe(true);

		await click(tab(container, "References"));
		expect(container.textContent).toContain("John 3:16");
		await click(button(container, "John 3:16") as HTMLButtonElement);
		expect(getSession().isSelectionInNode("bibleReference")).toBe(true);
		await click(button(container, "Remove John 3:16") as HTMLButtonElement);
		expect(
			getDocumentReferences(getSession().getDocument()).bibleReferences,
		).toEqual([]);
		await click(button(container, "[1]") as HTMLButtonElement);
		expect(getSession().isSelectionInNode("citation")).toBe(true);
		await click(button(container, "Remove [1]") as HTMLButtonElement);
		expect(getDocumentReferences(getSession().getDocument()).citations).toEqual(
			[],
		);
	});

	it("enters and exits focus without recreating the editor or changing content", async () => {
		const changes: RichTextDocument[] = [];
		const { container, getSession } = await mount({
			onChange: (nextDocument) => changes.push(nextDocument),
			slots: {
				focusedHeader: {
					status: "Saved",
					title: "No Condemnation in Christ",
				},
			},
		});
		const session = getSession();
		await click(tab(container, "Document"));
		await act(async () => {
			session.applyCommand("heading2");
		});
		const contentBeforeFocus = session.getDocument();
		const changeCountBeforeFocus = changes.length;

		await click(button(container, "Focus editor") as HTMLButtonElement);
		expect(container.querySelector("[data-focused]")).toBeTruthy();
		expect(window.document.body.style.overflow).toBe("hidden");
		expect(getSession()).toBe(session);
		expect(session.getDocument()).toEqual(contentBeforeFocus);
		expect(changes).toHaveLength(changeCountBeforeFocus);
		expect(button(container, "Exit Focus")).toBeTruthy();
		expect(container.textContent).toContain("No Condemnation in Christ");
		expect(container.textContent).toContain("Saved");

		await click(button(container, "Open writing tools") as HTMLButtonElement);
		expect(button(container, "Close writing tools")).toBeTruthy();
		expect(tab(container, "Document").getAttribute("aria-selected")).toBe(
			"true",
		);
		await pressEscape();
		expect(button(container, "Open writing tools")).toBeTruthy();
		await pressEscape();
		expect(container.querySelector("[data-focused]")).toBeNull();
		expect(window.document.body.style.overflow).toBe("");

		await click(button(container, "Focus editor") as HTMLButtonElement);
		await click(button(container, "Exit Focus") as HTMLButtonElement);
		expect(container.querySelector("[data-focused]")).toBeNull();
	});

	it("restores background scrolling when unmounted while focused", async () => {
		const { container, unmount } = await mount({});
		window.document.body.style.overflow = "scroll";
		await click(button(container, "Focus editor") as HTMLButtonElement);
		expect(window.document.body.style.overflow).toBe("hidden");

		unmount();
		expect(window.document.body.style.overflow).toBe("scroll");
	});

	it("uses the shared sheet for inspector access on narrow screens", async () => {
		setWideViewport(false);
		const { container, getSession } = await mount({});
		const session = getSession();

		await click(button(container, "Open writing tools") as HTMLButtonElement);
		expect(window.document.body.textContent).toContain("Writing tools");
		expect(window.document.querySelectorAll('[role="tablist"]')).toHaveLength(
			1,
		);
		expect(getSession()).toBe(session);
	});

	it("keeps the focused writing area intact when its narrow inspector opens", async () => {
		setWideViewport(false);
		const { container, getSession } = await mount({});
		const session = getSession();

		await click(button(container, "Focus editor") as HTMLButtonElement);
		await click(button(container, "Open writing tools") as HTMLButtonElement);
		expect(container.querySelector("[data-focused]")).toBeTruthy();
		expect(window.document.body.textContent).toContain("Writing tools");
		expect(getSession()).toBe(session);
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
	let session: EditorSession | null = null;

	await act(async () => {
		root.render(
			<RichTextEditorWorkspace
				{...props}
				onChange={(nextDocument) => props.onChange?.(nextDocument)}
				onSessionReady={(nextSession) => {
					if (nextSession) session = nextSession;
					props.onSessionReady?.(nextSession);
				}}
				value={document}
			/>,
		);
	});

	return {
		container,
		getSession: () => {
			if (!session) throw new Error("Editor session did not initialize.");
			return session;
		},
		unmount: () => {
			act(() => root.unmount());
			container.remove();
			const index = mounted.findIndex((entry) => entry.root === root);
			if (index >= 0) mounted.splice(index, 1);
		},
	};
}

async function click(element: Element) {
	await act(async () =>
		element.dispatchEvent(new MouseEvent("click", { bubbles: true })),
	);
}

async function pressEscape() {
	await act(async () =>
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
	);
}

function setWideViewport(matches: boolean) {
	wideViewport = matches;
	for (const listener of mediaQueryListeners)
		listener({ matches } as MediaQueryListEvent);
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
