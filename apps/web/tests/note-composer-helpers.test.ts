import type { RichTextDocument } from "@berean-study/rich-text-editor";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/functions/notes", () => ({
	listNotes: vi.fn(),
	listNoteTags: vi.fn(),
	saveNote: vi.fn(),
}));
vi.mock("../src/functions/passages", () => ({}));

import {
	noteToPlainText,
	toFileName,
} from "../src/components/notes/note-export";
import { extendSelection } from "../src/components/notes/note-passage-pickers";
import {
	areValuesEqual,
	formatSavedAgo,
	type NoteFormValues,
} from "../src/components/notes/note-save-lifecycle";
import { filterPassageOptions } from "../src/components/notes/note-study-data";

const values: NoteFormValues = {
	content: { content: [{ type: "paragraph" }], type: "doc" },
	passageIds: [1, 2],
	tags: ["Acts"],
	title: "Bereans",
};

describe("note composer helpers", () => {
	it("describes when a note was last saved", () => {
		const savedAt = new Date("2026-10-25T09:00:00");
		expect(formatSavedAgo(savedAt, new Date("2026-10-25T09:00:40"))).toBe(
			"just now",
		);
		expect(formatSavedAgo(savedAt, new Date("2026-10-25T09:02:10"))).toBe(
			"2 min ago",
		);
		expect(formatSavedAgo(savedAt, new Date("2026-10-25T11:00:00"))).toMatch(
			/^at /,
		);
	});

	it("compares every saved field, including passage order", () => {
		expect(areValuesEqual(values, { ...values })).toBe(true);
		expect(areValuesEqual(values, { ...values, passageIds: [2, 1] })).toBe(
			false,
		);
		expect(areValuesEqual(values, { ...values, tags: [] })).toBe(false);
		expect(areValuesEqual(values, { ...values, title: "Other" })).toBe(false);
	});

	it("matches passages on every word of the query", () => {
		const passages = [
			{ id: 1, label: "Acts 17:10–12" },
			{ id: 2, label: "Romans 8:1–11" },
			{ id: 3, label: "Romans 12:1–2" },
		];
		expect(filterPassageOptions(passages, "romans 12")).toEqual([passages[2]]);
		expect(filterPassageOptions(passages, "ROMANS")).toHaveLength(2);
		expect(filterPassageOptions(passages, "   ")).toEqual([]);
		expect(filterPassageOptions(passages, "romans", 1)).toHaveLength(1);
	});

	it("selects one verse, then extends to a range within the chapter", () => {
		const single = extendSelection(null, { chapter: 17, number: 11 });
		expect(single).toEqual({ chapter: 17, end: 11, start: 11 });
		expect(extendSelection(single, { chapter: 17, number: 10 })).toEqual({
			chapter: 17,
			end: 11,
			start: 10,
		});
		expect(extendSelection(single, { chapter: 18, number: 1 })).toEqual({
			chapter: 18,
			end: 1,
			start: 1,
		});
		const range = { chapter: 17, end: 12, start: 10 };
		expect(extendSelection(range, { chapter: 17, number: 11 })).toEqual({
			chapter: 17,
			end: 11,
			start: 11,
		});
	});

	it("exports a readable plain-text note", () => {
		const document: RichTextDocument = {
			content: [
				{
					attrs: { level: 2, variant: "observe" },
					content: [{ text: "Observe", type: "text" }],
					type: "heading",
				},
				{
					content: [{ text: "They searched daily.", type: "text" }],
					type: "paragraph",
				},
				{
					attrs: {
						book: "Acts",
						bookId: 44,
						chapter: 17,
						passageId: 1,
						translation: "KJV",
						verseEnd: 11,
						verseStart: 11,
					},
					type: "verseBlock",
				},
				{
					content: [
						{
							attrs: { checked: true },
							content: [
								{
									content: [{ text: "Read", type: "text" }],
									type: "paragraph",
								},
							],
							type: "taskItem",
						},
						{
							attrs: { checked: false },
							content: [
								{
									content: [{ text: "Share", type: "text" }],
									type: "paragraph",
								},
							],
							type: "taskItem",
						},
					],
					type: "taskList",
				},
			],
			type: "doc",
		};

		expect(noteToPlainText("Bereans", document)).toBe(
			"Bereans\n\nOBSERVE\n\nThey searched daily.\n\n[Acts 17:11 · KJV]\n\n[x] Read\n[ ] Share\n",
		);
		expect(toFileName("Searching the Scriptures daily!")).toBe(
			"searching-the-scriptures-daily.txt",
		);
		expect(toFileName("  ")).toBe("note.txt");
	});
});
