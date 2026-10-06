import { describe, expect, it } from "vitest";

import {
	createEditorCommandCatalog,
	filterEditorCommands,
} from "../src/editor-actions";
import { getNextCommandIndex } from "../src/slash-commands";

describe("slash commands", () => {
	it("filters actions by query and preset capabilities", () => {
		const memberCatalog = createEditorCommandCatalog({ preset: "member" });
		expect(memberCatalog.has("citation")).toBe(false);
		expect(memberCatalog.has("bible")).toBe(false);

		const contributorCatalog = createEditorCommandCatalog({
			onRequestBibleReference: () => ({ label: "John 3:16", passageId: 316 }),
			onRequestCitation: () => ({ citationId: 1, label: "1" }),
			preset: "contributor",
		});
		expect(contributorCatalog.commands().map((command) => command.id)).toEqual(
			expect.arrayContaining(["bible", "citation"]),
		);
		expect(
			filterEditorCommands(contributorCatalog.commands(), "head").map(
				(command) => command.id,
			),
		).toEqual(["heading2", "heading3"]);
	});

	it("wraps keyboard navigation through command results", () => {
		expect(getNextCommandIndex(0, "up", 3)).toBe(2);
		expect(getNextCommandIndex(2, "down", 3)).toBe(0);
		expect(getNextCommandIndex(0, "down", 0)).toBe(0);
	});
});
