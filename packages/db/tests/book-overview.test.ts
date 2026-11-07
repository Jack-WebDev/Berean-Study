import { describe, expect, it } from "vitest";

import {
	emptyBookOverview,
	outlineCoverage,
	overviewFields,
	parseOutlineRange,
} from "../src/book-overview";

describe("reading an outline range", () => {
	it.each([
		[
			"1:1–4:25",
			{ from: { chapter: 1, verse: 1 }, to: { chapter: 4, verse: 25 } },
		],
		[
			"1:1-4:25",
			{ from: { chapter: 1, verse: 1 }, to: { chapter: 4, verse: 25 } },
		],
		[
			"5–8",
			{ from: { chapter: 5, verse: null }, to: { chapter: 8, verse: null } },
		],
		[
			"9",
			{ from: { chapter: 9, verse: null }, to: { chapter: 9, verse: null } },
		],
		[
			"3:1-20",
			{ from: { chapter: 3, verse: 1 }, to: { chapter: 3, verse: 20 } },
		],
	])("reads %s", (text, expected) => {
		expect(parseOutlineRange(text)).toEqual(expected);
	});

	it.each(["", "chapter one", "4–1", "4:20–4:3", "0–2"])(
		"refuses %j",
		(text) => {
			expect(parseOutlineRange(text)).toBeNull();
		},
	);
});

describe("checking an outline against the whole book", () => {
	const row = (range: string) => ({ heading: "Heading", range });

	it("finds nothing wrong with an outline covering every chapter once", () => {
		expect(outlineCoverage([row("1–4"), row("5–8")], 8)).toEqual({
			missingChapters: [],
			repeatedChapters: [],
			unreadableRanges: [],
		});
	});

	it("names chapters no row covers", () => {
		expect(
			outlineCoverage([row("1–2"), row("5–6")], 6).missingChapters,
		).toEqual([3, 4]);
	});

	it("names chapters covered twice, but not a chapter split between rows", () => {
		expect(
			outlineCoverage([row("1–3"), row("3–5")], 5).repeatedChapters,
		).toEqual([3]);
		expect(
			outlineCoverage([row("1:1–2:10"), row("2:11–3:5")], 3).repeatedChapters,
		).toEqual([]);
	});

	it("names ranges it can't read", () => {
		expect(outlineCoverage([row("soon")], 1).unreadableRanges).toEqual([
			"soon",
		]);
	});

	it("has nothing to say about an empty outline", () => {
		expect(outlineCoverage([], 16)).toEqual({
			missingChapters: [],
			repeatedChapters: [],
			unreadableRanges: [],
		});
	});
});

describe("showing an overview for review", () => {
	it("lists its fields in reading order, so changes can be compared", () => {
		const fields = overviewFields({
			...emptyBookOverview,
			keyThemes: ["Grace", "Faith"],
			outline: [{ heading: "Righteousness revealed", range: "1–4" }],
			summary: "A letter on the gospel.",
		});
		expect(fields.map(({ label }) => label)).toEqual([
			"Summary",
			"Author",
			"Approximate date",
			"Written from",
			"First readers",
			"Key verse",
			"Key themes",
			"Outline",
		]);
		expect(fields.find(({ label }) => label === "Key themes")?.text).toBe(
			"Grace, Faith",
		);
		expect(fields.find(({ label }) => label === "Outline")?.text).toBe(
			"1–4 Righteousness revealed",
		);
	});
});
