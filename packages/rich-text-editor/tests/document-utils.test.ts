import { describe, expect, it } from "vitest";

import {
	extractDocumentHeadings,
	getCharacterCount,
	getDocumentSections,
	getDocumentVerseBlocks,
	getEstimatedReadingTime,
	getLinkedVerseCount,
	getOpenTaskCount,
	getWordCount,
	isSectionHeading,
} from "../src/document-utils";
import type { RichTextDocument } from "../src/types";
import { formatVerseReference } from "../src/verse-reference";

const document: RichTextDocument = {
	content: [
		{
			attrs: { level: 2 },
			content: [{ text: "Historical Context", type: "text" }],
			type: "heading",
		},
		{
			content: [{ text: "Three simple words.", type: "text" }],
			type: "paragraph",
		},
		{
			attrs: { level: 3 },
			content: [{ text: "Roman Background", type: "text" }],
			type: "heading",
		},
	],
	type: "doc",
};

describe("rich-text document utilities", () => {
	it("counts visible words and characters", () => {
		expect(getWordCount(document)).toBe(7);
		expect(getCharacterCount(document)).toBe(
			"Historical Context Three simple words. Roman Background".length,
		);
		expect(getEstimatedReadingTime(document, 4)).toBe(2);
	});

	it("extracts ordered H2/H3 outline entries", () => {
		expect(extractDocumentHeadings(document)).toEqual([
			{ id: "heading-1", level: 2, text: "Historical Context" },
			{ id: "heading-2", level: 3, text: "Roman Background" },
		]);
	});
});

const verse = {
	book: "Acts",
	bookId: 44,
	chapter: 17,
	passageId: 12,
	translation: "KJV",
	verseEnd: 12,
	verseStart: 10,
};

const studyNote: RichTextDocument = {
	content: [
		{
			content: [{ text: "Before any section.", type: "text" }],
			type: "paragraph",
		},
		{
			attrs: { level: 2, variant: "observe" },
			content: [{ text: "Observe", type: "text" }],
			type: "heading",
		},
		{ content: [{ text: "They searched.", type: "text" }], type: "paragraph" },
		{ type: "paragraph" },
		{ attrs: verse, type: "verseBlock" },
		{
			attrs: { level: 3 },
			content: [{ text: "Still observe", type: "text" }],
			type: "heading",
		},
		{
			attrs: { level: 2, variant: "apply" },
			content: [{ text: "Apply", type: "text" }],
			type: "heading",
		},
		{
			content: [
				{
					attrs: { checked: true },
					content: [
						{ content: [{ text: "Read", type: "text" }], type: "paragraph" },
					],
					type: "taskItem",
				},
				{
					attrs: { checked: false },
					content: [
						{ content: [{ text: "Ask", type: "text" }], type: "paragraph" },
					],
					type: "taskItem",
				},
				{
					attrs: { checked: false },
					content: [
						{ content: [{ text: "Share", type: "text" }], type: "paragraph" },
					],
					type: "taskItem",
				},
			],
			type: "taskList",
		},
		{
			attrs: { ...verse, verseEnd: 11, verseStart: 11 },
			type: "verseBlock",
		},
	],
	type: "doc",
};

describe("study note structure", () => {
	it("splits the note into sections at template headings and H1/H2", () => {
		expect(getDocumentSections(studyNote)).toEqual([
			{
				index: 0,
				paragraphs: 1,
				tasks: { done: 0, total: 0 },
				text: "Observe",
				variant: "observe",
				verses: 1,
			},
			{
				index: 1,
				paragraphs: 0,
				tasks: { done: 1, total: 3 },
				text: "Apply",
				variant: "apply",
				verses: 1,
			},
		]);
	});

	it("treats plain H1 and H2 as sections but not H3", () => {
		expect(isSectionHeading({ attrs: { level: 1 }, type: "heading" })).toBe(
			true,
		);
		expect(isSectionHeading({ attrs: { level: 2 }, type: "heading" })).toBe(
			true,
		);
		expect(isSectionHeading({ attrs: { level: 3 }, type: "heading" })).toBe(
			false,
		);
		expect(
			isSectionHeading({
				attrs: { level: 3, variant: "section" },
				type: "heading",
			}),
		).toBe(true);
	});

	it("lists quoted verses with the section they sit in", () => {
		expect(getDocumentVerseBlocks(studyNote)).toEqual([
			{ attributes: verse, nodeIndex: 0, sectionIndex: 0 },
			{
				attributes: { ...verse, verseEnd: 11, verseStart: 11 },
				nodeIndex: 1,
				sectionIndex: 1,
			},
		]);
		expect(getLinkedVerseCount(studyNote)).toBe(4);
	});

	it("ignores malformed verse blocks", () => {
		const document: RichTextDocument = {
			content: [
				{ attrs: { ...verse, verseEnd: 2 }, type: "verseBlock" },
				{ attrs: verse, type: "verseBlock" },
			],
			type: "doc",
		};
		expect(getDocumentVerseBlocks(document)).toEqual([
			{ attributes: verse, nodeIndex: 1, sectionIndex: null },
		]);
	});

	it("counts unchecked checklist items", () => {
		expect(getOpenTaskCount(studyNote)).toBe(2);
	});

	it("formats single verses and ranges", () => {
		expect(formatVerseReference(verse)).toBe("Acts 17:10–12");
		expect(
			formatVerseReference({ ...verse, verseEnd: 11, verseStart: 11 }),
		).toBe("Acts 17:11");
	});
});
