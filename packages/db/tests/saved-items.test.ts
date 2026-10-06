import { describe, expect, it } from "vitest";

import { createSavedLibrary } from "../src/saved-items";

describe("createSavedLibrary", () => {
	it("keeps Scripture, Community, and highlight identities intact", () => {
		const library = createSavedLibrary(
			{
				bookmarks: [{ label: "John 3:16", passageId: 16 }],
				highlights: [
					{
						bookName: "John",
						chapterNumber: 3,
						endOffset: 16,
						id: 8,
						startOffset: 9,
						text: "For God so loved the world.",
						translationAbbreviation: "ESV",
						verseNumber: 16,
					},
				],
			},
			[
				{
					coverImage: null,
					id: 12,
					title: "A faithful season",
					type: "testimony",
				},
			],
		);

		expect(library.bookmarks).toEqual([
			{
				identity: { kind: "scripture", passageId: 16 },
				item: { label: "John 3:16", passageId: 16 },
				kind: "scripture",
			},
			{
				identity: { kind: "community", postId: 12 },
				item: {
					coverImage: null,
					id: 12,
					title: "A faithful season",
					type: "testimony",
				},
				kind: "community",
			},
		]);
		expect(library.highlights).toEqual([
			{
				identity: { highlightId: 8, kind: "highlight" },
				item: {
					bookName: "John",
					chapterNumber: 3,
					endOffset: 16,
					id: 8,
					startOffset: 9,
					text: "For God so loved the world.",
					translationAbbreviation: "ESV",
					verseNumber: 16,
				},
				kind: "highlight",
			},
		]);
	});
});
