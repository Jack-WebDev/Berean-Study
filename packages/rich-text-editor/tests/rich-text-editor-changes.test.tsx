import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { RichTextEditor } from "../src/rich-text-editor";
import type { RichTextDocument } from "../src/types";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: { container: HTMLDivElement; root: Root }[] = [];

afterEach(() => {
	for (const { container, root } of mounted.splice(0)) {
		act(() => root.unmount());
		container.remove();
	}
});

const documents: [string, RichTextDocument][] = [
	["an empty document", { content: [{ type: "paragraph" }], type: "doc" }],
	[
		"a document with text",
		{
			content: [{ content: [{ text: "Hi", type: "text" }], type: "paragraph" }],
			type: "doc",
		},
	],
];

describe("RichTextEditor changes", () => {
	// Hosts autosave on change, so a change reported on load would save (and,
	// for a new entry, create) something the member never wrote.
	it.each(documents)(
		"doesn't report a change when %s loads",
		async (_name, value) => {
			const changes: RichTextDocument[] = [];
			const container = document.createElement("div");
			document.body.append(container);
			const root = createRoot(container);
			mounted.push({ container, root });

			await act(async () => {
				root.render(
					<RichTextEditor
						onChange={(next) => changes.push(next)}
						value={value}
					/>,
				);
			});
			await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

			expect(changes).toEqual([]);
		},
	);
});
