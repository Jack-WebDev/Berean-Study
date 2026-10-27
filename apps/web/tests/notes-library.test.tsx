import type { RichTextDocument } from "@berean-study/rich-text-editor";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params: _params,
		replace: _replace,
		search: _search,
		to: _to,
		...props
	}: {
		children: ReactNode;
		params?: unknown;
		replace?: boolean;
		search?: unknown;
		to: string;
	}) => (
		<a href="/library/notes" {...props}>
			{children}
		</a>
	),
	useNavigate: () => navigate,
}));

import {
	dateGroupLabel,
	describeListItem,
	formatEdited,
	groupNotes,
} from "../src/components/notes/note-library";
import { NotesList } from "../src/components/notes/notes-list";
import type { Note } from "../src/components/notes/types";
import { formatTimeOrDate } from "../src/utils/dates";

beforeAll(() => {
	// jsdom doesn't lay out pages, so it has no scrollIntoView.
	Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
	cleanup();
	navigate.mockReset();
});

const now = new Date("2026-10-25T15:00:00");

function doc(text: string): RichTextDocument {
	return {
		content: [
			{ content: text ? [{ text, type: "text" }] : [], type: "paragraph" },
		],
		type: "doc",
	};
}

function note(overrides: Partial<Note> & { id: number }): Note {
	return {
		bookName: null,
		content: doc("Body text"),
		createdAt: now,
		passageId: null,
		passages: [],
		passageTitle: null,
		pinnedAt: null,
		purpose: null,
		status: "saved",
		tags: [],
		title: `Note ${overrides.id}`,
		updatedAt: now,
		...overrides,
	};
}

describe("notes list helpers", () => {
	it("borrows an untitled note's opening words without repeating them", () => {
		expect(
			describeListItem({
				content: doc("Call me naive but I aspire to be what Dostoyevsky said."),
				title: "",
			}),
		).toEqual({
			isUntitled: false,
			preview: "…to be what Dostoyevsky said.",
			title: "Call me naive but I aspire…",
		});
		expect(describeListItem({ content: doc("F"), title: "" })).toEqual({
			isUntitled: true,
			preview: "F",
			title: "Untitled",
		});
		expect(
			describeListItem({ content: doc("Grace upon grace"), title: "" }),
		).toEqual({ isUntitled: false, preview: "", title: "Grace upon grace" });
		expect(
			describeListItem({ content: doc("Body"), title: "  Titled " }),
		).toMatchObject({ preview: "Body", title: "Titled" });
		expect(
			describeListItem({
				content: {
					content: [
						{
							attrs: { level: 2, variant: "observe" },
							content: [{ text: "Observe", type: "text" }],
							type: "heading",
						},
						...(doc("They searched daily").content ?? []),
					],
					type: "doc",
				},
				title: "Bereans",
			}).preview,
		).toBe("They searched daily");
	});

	it("labels dates the way the library groups them", () => {
		expect(dateGroupLabel(new Date("2026-10-25T00:05:00"), now)).toBe("Today");
		expect(dateGroupLabel(new Date("2026-10-24T23:55:00"), now)).toBe(
			"Yesterday",
		);
		expect(dateGroupLabel(new Date("2026-10-18T09:00:00"), now)).toBe(
			"Previous 7 days",
		);
		expect(dateGroupLabel(new Date("2026-09-30T09:00:00"), now)).toBe(
			"September",
		);
		expect(dateGroupLabel(new Date("2025-12-01T09:00:00"), now)).toBe(
			"December 2025",
		);
	});

	it("shows a time for today's notes and a date for older ones", () => {
		expect(formatTimeOrDate(new Date("2026-10-25T12:58:00"), now)).toMatch(
			/12:58/,
		);
		expect(formatTimeOrDate(new Date("2026-10-03T12:58:00"), now)).toBe(
			"Oct 3",
		);
		expect(formatTimeOrDate(new Date("2025-10-03T12:58:00"), now)).toBe(
			"Oct 3, 2025",
		);
		expect(formatEdited(new Date("2026-10-24T09:15:00"), now)).toMatch(
			/^Edited yesterday at 9:15/,
		);
	});

	it("puts pinned notes first and keeps a title sort in one group", () => {
		const notes = [
			note({ id: 1, updatedAt: new Date("2026-10-25T10:00:00") }),
			note({
				id: 2,
				pinnedAt: now,
				updatedAt: new Date("2026-09-01T10:00:00"),
			}),
			note({ id: 3, updatedAt: new Date("2026-10-24T10:00:00") }),
		];
		const summary = (sort: "title" | "updated") =>
			groupNotes(notes, sort, now).map((group) => [
				group.label,
				group.notes.map((grouped) => grouped.id),
			]);

		expect(summary("updated")).toEqual([
			["Pinned", [2]],
			["Today", [1]],
			["Yesterday", [3]],
		]);
		expect(summary("title")).toEqual([
			["Pinned", [2]],
			["All notes", [1, 3]],
		]);
	});
});

describe("notes list", () => {
	const notes = [
		note({ id: 1, status: "draft", title: "" }),
		note({
			id: 2,
			passages: [
				{ id: 7, label: "Acts 17:10–12" },
				{ id: 8, label: "Romans 8" },
			],
		}),
	];

	it("marks the selected note and shows drafts and linked passages", () => {
		render(
			<NotesList
				isNarrow={false}
				notes={notes}
				search={{}}
				selectedNoteId={2}
				sort="updated"
			/>,
		);

		const selected = screen.getByRole("link", { current: true });
		expect(selected.textContent).toContain("Note 2");
		expect(selected.textContent).toContain("Acts 17:10–12 +1");
		expect(screen.getAllByText("Draft")).toHaveLength(1);
		expect(screen.queryByText(/Unlinked/)).toBeNull();
	});

	it("moves the selection with the arrow keys and opens the editor on Enter", () => {
		render(
			<NotesList
				isNarrow={false}
				notes={notes}
				search={{ q: "grace" }}
				selectedNoteId={1}
				sort="updated"
			/>,
		);
		const [first, second] = screen.getAllByRole("link");
		if (!first || !second) throw new Error("Expected two rows.");
		expect(first.getAttribute("tabindex")).toBe("0");
		expect(second.getAttribute("tabindex")).toBe("-1");

		fireEvent.keyDown(first, { key: "ArrowDown" });
		expect(document.activeElement).toBe(second);
		expect(navigate).toHaveBeenCalledWith({
			replace: true,
			search: { note: 2, q: "grace" },
			to: "/library/notes",
		});

		fireEvent.keyDown(second, { key: "Enter" });
		expect(navigate).toHaveBeenLastCalledWith({
			params: { noteId: 2 },
			to: "/library/notes/$noteId/edit",
		});
	});
});
