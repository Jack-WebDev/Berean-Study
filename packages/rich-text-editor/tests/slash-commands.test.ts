import { describe, expect, it } from "vitest";

import {
	filterEditorActions,
	getAvailableEditorActions,
} from "../src/editor-actions";
import { getNextCommandIndex } from "../src/slash-commands";

describe("slash commands", () => {
	it("filters actions by query and preset capabilities", () => {
		const memberActions = getAvailableEditorActions({ preset: "member" });
		expect(memberActions.map((action) => action.id)).not.toContain("citation");
		expect(memberActions.map((action) => action.id)).not.toContain("bible");

		const contributorActions = getAvailableEditorActions({
			onRequestBibleReference: () => ({ label: "John 3:16", passageId: 316 }),
			onRequestCitation: () => ({ citationId: 1, label: "1" }),
			preset: "contributor",
		});
		expect(contributorActions.map((action) => action.id)).toEqual(
			expect.arrayContaining(["bible", "citation"]),
		);
		expect(
			filterEditorActions(contributorActions, "head").map(
				(action) => action.id,
			),
		).toEqual(["heading2", "heading3"]);
	});

	it("wraps keyboard navigation through command results", () => {
		expect(getNextCommandIndex(0, "up", 3)).toBe(2);
		expect(getNextCommandIndex(2, "down", 3)).toBe(0);
		expect(getNextCommandIndex(0, "down", 0)).toBe(0);
	});
});
