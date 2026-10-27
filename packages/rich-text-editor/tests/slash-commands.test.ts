import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import {
	createEditorCommandCatalog,
	filterEditorCommands,
} from "../src/editor-actions";
import { createRichTextExtensions } from "../src/editor-extensions";
import { selectSlashCommands } from "../src/slash-command-menu";
import {
	getNextCommandIndex,
	journalSlashCommands,
	slashCommandPluginKey,
} from "../src/slash-commands";

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
		).toEqual(["heading1", "heading2", "heading3"]);
	});

	it("wraps keyboard navigation through command results", () => {
		expect(getNextCommandIndex(0, "up", 3)).toBe(2);
		expect(getNextCommandIndex(2, "down", 3)).toBe(0);
		expect(getNextCommandIndex(0, "down", 0)).toBe(0);
	});
});

describe("slash command state", () => {
	it("opens as soon as / is typed and follows the query", () => {
		const editor = new Editor({
			content: "<p></p>",
			element: document.createElement("div"),
			extensions: createRichTextExtensions(),
		});
		editor.commands.insertContent("/");
		expect(slashCommandPluginKey.getState(editor.state)).toEqual({
			from: 1,
			query: "",
		});
		editor.commands.insertContent("ver");
		expect(slashCommandPluginKey.getState(editor.state)?.query).toBe("ver");
		editor.destroy();
	});
});

describe("host-chosen slash menu", () => {
	it("keeps the host's order and labels, and skips commands that aren't available", () => {
		const catalog = createEditorCommandCatalog({
			onRequestVerse: () => null,
			preset: "member",
		});

		expect(
			selectSlashCommands(catalog.commands(), journalSlashCommands).map(
				({ hint, id, label }) => ({ hint, id, label }),
			),
		).toEqual([
			{ hint: "e.g. John 3:16", id: "verse", label: "Verse" },
			{ hint: undefined, id: "heading2", label: "Heading" },
			{ hint: undefined, id: "bullet", label: "Bulleted list" },
		]);
	});

	it("offers the person command only when the host can ask for a name", async () => {
		const plain = createEditorCommandCatalog({ preset: "member" });
		expect(plain.has("person")).toBe(false);

		const inserted: string[] = [];
		const withPerson = createEditorCommandCatalog({
			onRequestPerson: () => "  Sipho ",
			preset: "member",
		});
		const person = withPerson.find("person");
		await person?.execute({
			applyCommand: () => false,
			insertBibleReference: () => false,
			insertCitation: () => false,
			insertText: (text) => inserted.push(text) > 0,
			insertVerseBlock: () => false,
		});

		expect(inserted).toEqual(["Sipho"]);
	});
});
