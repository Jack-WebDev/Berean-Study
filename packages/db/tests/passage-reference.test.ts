import { describe, expect, it } from "vitest";

import { formatPassageReference } from "../src/passages";

describe("formatPassageReference", () => {
	it("writes a single verse, a range and a range across chapters", () => {
		expect(formatPassageReference("John", [3, 16], [3, 16])).toBe("John 3:16");
		expect(formatPassageReference("Romans", [8, 1], [8, 4])).toBe(
			"Romans 8:1–4",
		);
		expect(formatPassageReference("Romans", [7, 24], [8, 2])).toBe(
			"Romans 7:24–8:2",
		);
	});

	it("calls one psalm a Psalm, but keeps Psalms across several", () => {
		expect(formatPassageReference("Psalms", [88, 1], [88, 3])).toBe(
			"Psalm 88:1–3",
		);
		expect(formatPassageReference("Psalms", [42, 11], [43, 5])).toBe(
			"Psalms 42:11–43:5",
		);
	});
});
