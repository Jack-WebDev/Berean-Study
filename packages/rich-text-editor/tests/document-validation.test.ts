import { describe, expect, it } from "vitest";

import {
	emptyRichTextDocument,
	normalizeRichTextDocument,
} from "../src/document-validation";

describe("rich-text document validation", () => {
	it("falls back to an empty document for malformed persisted input", () => {
		expect(normalizeRichTextDocument(null)).toEqual(emptyRichTextDocument);
		expect(normalizeRichTextDocument({ type: "paragraph" })).toEqual(
			emptyRichTextDocument,
		);
		expect(normalizeRichTextDocument({ content: [], type: "doc" })).toEqual({
			content: [],
			type: "doc",
		});
	});
});
