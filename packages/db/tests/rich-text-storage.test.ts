import { describe, expect, it } from "vitest";

import {
	parseStoredRichText,
	serializeRichTextDocument,
} from "../src/rich-text-storage";

const document = {
	content: [
		{
			content: [{ text: "God is faithful.", type: "text" }],
			type: "paragraph",
		},
	],
	type: "doc" as const,
};

describe("rich-text storage", () => {
	it("keeps the text-column representation private to the repository layer", () => {
		const stored = serializeRichTextDocument(document);

		expect(stored).toBe(JSON.stringify(document));
		expect(parseStoredRichText(stored)).toEqual(document);
	});

	it("treats malformed stored values as an empty document", () => {
		expect(parseStoredRichText("not JSON")).toEqual({
			content: [{ type: "paragraph" }],
			type: "doc",
		});
	});
});
