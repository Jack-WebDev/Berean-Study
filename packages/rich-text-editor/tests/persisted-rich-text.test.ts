import { describe, expect, it } from "vitest";
import { emptyRichTextDocument } from "../src/document-validation";
import {
	getPersistedRichTextExcerpt,
	getPersistedRichTextText,
	parsePersistedRichText,
	serializePersistedRichText,
} from "../src/persisted-rich-text";
import type { RichTextDocument } from "../src/types";

const document: RichTextDocument = {
	content: [
		{
			content: [{ text: "God is faithful.", type: "text" }],
			type: "paragraph",
		},
	],
	type: "doc",
};

describe("persisted rich text", () => {
	it("preserves stored rich-text documents and serializes validated values", () => {
		expect(parsePersistedRichText(JSON.stringify(document))).toEqual(document);
		expect(serializePersistedRichText(document)).toBe(JSON.stringify(document));
		expect(serializePersistedRichText({ type: "paragraph" })).toBe(
			JSON.stringify(emptyRichTextDocument),
		);
	});

	it("rejects plaintext, malformed JSON, and non-document JSON", () => {
		for (const content of [
			"Please provide wisdom.",
			'{"type":"paragraph"}',
			JSON.stringify({ content: [] }),
		]) {
			expect(parsePersistedRichText(content)).toEqual(emptyRichTextDocument);
			expect(getPersistedRichTextText(content)).toBe("");
		}
	});

	it("extracts visible text and applies one excerpt policy", () => {
		const content = JSON.stringify({
			content: [
				{
					content: [
						{ text: "A legacy", type: "text" },
						{ text: " prayer", type: "text" },
					],
					type: "paragraph",
				},
			],
			type: "doc",
		});

		expect(getPersistedRichTextText(content)).toBe("A legacy prayer");
		expect(getPersistedRichTextExcerpt(content, 8)).toBe("A legacy…");
		expect(
			getPersistedRichTextExcerpt(
				JSON.stringify({
					content: [
						{
							content: [{ text: "a".repeat(181), type: "text" }],
							type: "paragraph",
						},
					],
					type: "doc",
				}),
				177,
			),
		).toHaveLength(178);
	});
});
