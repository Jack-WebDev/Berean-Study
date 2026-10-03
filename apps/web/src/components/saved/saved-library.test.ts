import { describe, expect, it } from "vitest";

import { createSavedLibrary } from "./saved-library";

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
				item: { label: "John 3:16", passageId: 16 },
				kind: "scripture",
			},
			{
				item: {
					coverImage: null,
					id: 12,
					title: "A faithful season",
					type: "testimony",
				},
				kind: "community",
			},
		]);
		expect(library.highlights).toHaveLength(1);
		expect(library.highlights[0]?.id).toBe(8);
	});
});
