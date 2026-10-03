import {
	emptyRichTextDocument,
	getDocumentText,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";
import { describe, expect, it } from "vitest";

import {
	getPrayerContentExcerpt,
	parsePrayerContent,
} from "../src/components/prayer/prayer-content";

describe("prayer content", () => {
	it("keeps a stored rich-text document", () => {
		const document: RichTextDocument = {
			content: [
				{
					content: [{ text: "God is faithful.", type: "text" }],
					type: "paragraph",
				},
			],
			type: "doc",
		};

		expect(parsePrayerContent(JSON.stringify(document))).toEqual(document);
	});

	it("converts legacy and malformed text into readable content", () => {
		expect(getDocumentText(parsePrayerContent("Please provide wisdom."))).toBe(
			"Please provide wisdom.",
		);
		expect(getDocumentText(parsePrayerContent('{"type":"paragraph"}'))).toBe(
			'{"type":"paragraph"}',
		);
	});

	it("returns an empty document for blank content", () => {
		expect(parsePrayerContent("  ")).toEqual(emptyRichTextDocument);
	});

	it("creates a truncated excerpt from the interpreted content", () => {
		expect(getPrayerContentExcerpt("A legacy prayer", 8)).toBe("A legacy…");
	});
});
