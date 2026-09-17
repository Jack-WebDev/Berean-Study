import { describe, expect, it } from "vitest";

import {
	emptyRichTextDocument,
	hasRichTextContent,
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

	it("distinguishes an empty document from meaningful structured content", () => {
		expect(hasRichTextContent(emptyRichTextDocument)).toBe(false);
		expect(
			hasRichTextContent({
				content: [
					{
						attrs: { label: "Romans 8:1", passageId: 1 },
						type: "bibleReference",
					},
				],
				type: "doc",
			}),
		).toBe(true);
		expect(
			hasRichTextContent({
				content: [
					{
						content: [
							{
								content: [{ text: "Table content", type: "text" }],
								type: "tableCell",
							},
						],
						type: "tableRow",
					},
				],
				type: "doc",
			}),
		).toBe(true);
	});
});
