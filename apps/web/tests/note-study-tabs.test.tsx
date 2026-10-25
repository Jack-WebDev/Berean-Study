import type {
	EditorSession,
	RichTextDocument,
} from "@berean-study/rich-text-editor";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const passageMocks = vi.hoisted(() => ({
	getPassageStudyContext: vi.fn(),
	getPassageText: vi.fn(),
	listRecentPassages: vi.fn(),
	listTranslations: vi.fn(),
}));

vi.mock("../src/functions/passages", () => ({
	...passageMocks,
	getPassageOptions: vi.fn(),
	getPreferredTranslation: vi.fn(),
}));
vi.mock("../src/functions/notes", () => ({
	listNotes: vi.fn(),
	listNoteTags: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
	}: {
		children: ReactNode;
		className?: string;
	}) => (
		<a className={className} href="/bible">
			{children}
		</a>
	),
}));

import { NoteOutlineTab } from "../src/components/notes/note-outline-tab";
import { NotePassageTab } from "../src/components/notes/note-passage-tab";
import { renderWithQueryClient } from "./render-with-query-client";

afterEach(cleanup);

const acts = {
	book: "Acts",
	bookId: 44,
	chapter: 17,
	passageId: 7,
	translation: "KJV",
	verseEnd: 11,
	verseStart: 11,
};

const document: RichTextDocument = {
	content: [
		{
			attrs: { level: 2, variant: "observe" },
			content: [{ text: "Observe", type: "text" }],
			type: "heading",
		},
		{ content: [{ text: "They searched.", type: "text" }], type: "paragraph" },
		{ attrs: acts, type: "verseBlock" },
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
			],
			type: "taskList",
		},
	],
	type: "doc",
};

describe("Outline tab", () => {
	it("derives sections, quoted verses and open tasks from the note", () => {
		const session = {
			appendSection: vi.fn(),
			focusSection: vi.fn(),
			focusStructuredNode: vi.fn(),
		} as unknown as EditorSession;
		render(
			<NoteOutlineTab
				activeSectionIndex={1}
				document={document}
				session={session}
			/>,
		);

		const sections = within(
			screen.getByRole("region", { name: "In this note" }),
		);
		const observe = sections.getByRole("button", { name: /Observe/ });
		expect(observe.textContent).toContain("1 paragraph · 1 verse");
		const apply = sections.getByRole("button", { name: /Apply/ });
		expect(apply.getAttribute("aria-current")).toBe("location");
		expect(apply.textContent).toContain("You’re here");
		expect(apply.textContent).toContain("1 of 2 done");
		expect(screen.getByText("1 unchecked item in this note.")).toBeTruthy();

		fireEvent.click(observe);
		expect(session.focusSection).toHaveBeenCalledWith(0);

		fireEvent.click(screen.getByRole("button", { name: /Acts 17:11/ }));
		expect(session.focusStructuredNode).toHaveBeenCalledWith("verseBlock", 0);

		fireEvent.click(screen.getByRole("button", { name: "Add a section" }));
		expect(session.appendSection).toHaveBeenCalled();
	});
});

describe("Passage tab", () => {
	beforeEach(() => {
		for (const mock of Object.values(passageMocks)) mock.mockReset();
		passageMocks.listTranslations.mockResolvedValue([
			{ abbreviation: "KJV", id: 1, name: "King James Version" },
		]);
		passageMocks.getPassageText.mockResolvedValue({
			bookId: 44,
			bookName: "Acts",
			passage: { id: 7, label: "Acts 17:10–12" },
			translation: { abbreviation: "KJV", id: 1, name: "King James Version" },
			verses: [
				{ chapter: 17, number: 10, text: "Sent away by night." },
				{ chapter: 17, number: 11, text: "These were more noble." },
				{ chapter: 17, number: 12, text: "Many believed." },
			],
		});
		passageMocks.getPassageStudyContext.mockResolvedValue({
			passage: { id: 7, label: "Acts 17:10–12" },
			relatedPassages: [{ id: 9, label: "John 5:39" }],
			themes: [],
		});
		passageMocks.listRecentPassages.mockResolvedValue([
			{ id: 3, label: "Psalm 119:105" },
		]);
	});

	it("searches and lists recent passages before one is linked", async () => {
		const onLinkPassage = vi.fn();
		renderWithQueryClient(
			<NotePassageTab
				activePassageId={null}
				focusedVerse={null}
				linkedPassages={[]}
				onActivePassageChange={vi.fn()}
				onLinkPassage={onLinkPassage}
				onQuote={vi.fn()}
				onTranslationChange={vi.fn()}
				passages={[
					{ id: 7, label: "Acts 17:10–12" },
					{ id: 8, label: "Romans 12:1–2" },
				]}
				quotedVerses={[]}
				translation="KJV"
				translationId={null}
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Link Psalm 119:105" }),
		);
		expect(onLinkPassage).toHaveBeenCalledWith(3);

		fireEvent.change(screen.getByLabelText("Find a passage"), {
			target: { value: "romans" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Romans 12:1–2" }));
		expect(onLinkPassage).toHaveBeenCalledWith(8);
	});

	it("marks quoted verses and quotes the selected verse", async () => {
		const onQuote = vi.fn();
		const onLinkPassage = vi.fn();
		renderWithQueryClient(
			<NotePassageTab
				activePassageId={7}
				focusedVerse={null}
				linkedPassages={[{ id: 7, label: "Acts 17:10–12" }]}
				onActivePassageChange={vi.fn()}
				onLinkPassage={onLinkPassage}
				onQuote={onQuote}
				onTranslationChange={vi.fn()}
				passages={null}
				quotedVerses={[{ attributes: acts, nodeIndex: 0, sectionIndex: 0 }]}
				translation="KJV"
				translationId={null}
			/>,
		);

		const text = await screen.findByRole("list", { name: "Passage text" });
		expect(
			within(text).getByRole("button", { name: "Verse 11, quoted in note" }),
		).toBeTruthy();

		fireEvent.click(within(text).getByRole("button", { name: "Verse 12" }));
		fireEvent.click(screen.getByRole("button", { name: "Quote v.12 in note" }));
		expect(onQuote).toHaveBeenCalledWith({
			...acts,
			verseEnd: 12,
			verseStart: 12,
		});

		fireEvent.click(
			await screen.findByRole("button", {
				name: "Link John 5:39 to this note",
			}),
		);
		expect(onLinkPassage).toHaveBeenCalledWith(9);
	});
});
