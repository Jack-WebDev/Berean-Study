import { describe, expect, it } from "vitest";

import { opensEntryEditor } from "../src/components/staff/scripture/entry/entry-routing";

describe("opensEntryEditor", () => {
	it("starts on the tradition cards when nothing has been chosen", () => {
		expect(opensEntryEditor({})).toBe(false);
	});

	it("opens the editor for the Protestant canon", () => {
		expect(opensEntryEditor({ canon: "protestant" })).toBe(true);
	});

	it("stays on the cards for a tradition that isn't open yet", () => {
		expect(opensEntryEditor({ canon: "catholic" })).toBe(false);
		expect(
			opensEntryEditor({ book: "tobit", canon: "catholic", t: "KJV" }),
		).toBe(false);
	});

	it("goes straight to the text from a link to a specific chapter", () => {
		expect(opensEntryEditor({ book: "daniel", chapter: 13, t: "KJV" })).toBe(
			true,
		);
	});
});
