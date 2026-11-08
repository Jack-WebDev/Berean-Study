import { describe, expect, it } from "vitest";

import { findInBible } from "../src/components/bible/find-in-bible";

const books = [
	{ chapterCount: 50, name: "Genesis", slug: "genesis" },
	{ chapterCount: 150, name: "Psalms", slug: "psalms" },
	{ chapterCount: 21, name: "John", slug: "john" },
	{ chapterCount: 16, name: "Romans", slug: "romans" },
	{ chapterCount: 5, name: "1 John", slug: "1-john" },
	{ chapterCount: 1, name: "Jude", slug: "jude" },
];

describe("finding a book or verse", () => {
	it.each([
		["John 3:16", "John 3:16"],
		["jn3:16", "John 3:16"],
		["john 3 16", "John 3:16"],
		["Jn. 3.16", "John 3:16"],
		["1 john 2:1", "1 John 2:1"],
		["1jn 2", "1 John 2"],
		["ps 23", "Psalm 23"],
		["Romans 8", "Romans 8"],
	])("reads %s as %s", (query, label) => {
		expect(findInBible(query, books)[0]).toMatchObject({
			kind: "place",
			label,
		});
	});

	it("gives the verse and chapter to open", () => {
		expect(findInBible("jn3:16", books)).toEqual([
			{
				bookSlug: "john",
				chapter: 3,
				kind: "place",
				label: "John 3:16",
				verse: 16,
			},
		]);
		expect(findInBible("Romans 8", books)[0]).toMatchObject({ verse: null });
	});

	it("suggests books as the name is typed", () => {
		expect(findInBible("j", books).map((result) => result.label)).toEqual([
			"John",
			"Jude",
		]);
		expect(findInBible("rom", books)).toEqual([
			{ bookSlug: "romans", chapterCount: 16, kind: "book", label: "Romans" },
		]);
		expect(findInBible("1 jo", books).map((result) => result.label)).toEqual([
			"1 John",
		]);
	});

	it("finds nothing for a chapter past the end, or a book not in the list", () => {
		expect(findInBible("Romans 17", books)).toEqual([]);
		expect(findInBible("Tobit 1", books)).toEqual([]);
		expect(findInBible("tob", books)).toEqual([]);
		expect(findInBible("   ", books)).toEqual([]);
	});
});
