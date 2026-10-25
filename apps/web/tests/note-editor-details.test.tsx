import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const noteMocks = vi.hoisted(() => ({
	listNotes: vi.fn(),
	listNoteTags: vi.fn(),
	listNoteVersions: vi.fn(),
}));
const communityMocks = vi.hoisted(() => ({
	listCommunityPublishingResources: vi.fn(),
}));

vi.mock("../src/functions/notes", () => noteMocks);
vi.mock("../src/functions/community", () => communityMocks);
vi.mock("../src/functions/collections", () => ({}));
vi.mock("../src/functions/passages", () => ({}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => (
		<a href="/library/notes">{children}</a>
	),
	useNavigate: () => vi.fn(),
}));

import { NoteDetailsTab } from "../src/components/notes/note-details-tab";
import { PurposeProperty } from "../src/components/notes/note-properties";
import { renderWithQueryClient } from "./render-with-query-client";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const storedNote = {
	createdAt: new Date("2026-10-25T07:40:00"),
	id: 9,
	status: "draft" as const,
	updatedAt: new Date(),
};

describe("purpose property", () => {
	it("selects one purpose and clears it when pressed again", () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<PurposeProperty onChange={onChange} purpose={null} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "Reflection" }));
		expect(onChange).toHaveBeenLastCalledWith("reflection");

		rerender(<PurposeProperty onChange={onChange} purpose="reflection" />);
		const reflection = screen.getByRole("button", { name: "Reflection" });
		expect(reflection.getAttribute("aria-pressed")).toBe("true");
		expect(
			screen
				.getByRole("button", { name: "Prayer" })
				.getAttribute("aria-pressed"),
		).toBe("false");

		fireEvent.click(reflection);
		expect(onChange).toHaveBeenLastCalledWith(null);
	});
});

describe("details tab", () => {
	const renderDetails = (onRestoreVersion = vi.fn()) =>
		renderWithQueryClient(
			<NoteDetailsTab
				document={{ content: [{ type: "paragraph" }], type: "doc" }}
				isRestoring={false}
				mainPassage={null}
				onDelete={vi.fn()}
				onDuplicate={vi.fn()}
				onExport={vi.fn()}
				onRestoreVersion={onRestoreVersion}
				storedNote={storedNote}
			/>,
		);

	it("lists versions and restores an earlier one", async () => {
		noteMocks.listNoteVersions.mockResolvedValue([
			{
				createdAt: new Date(),
				id: 3,
				isCurrent: true,
				summary: "Added Interpret",
			},
			{
				createdAt: new Date("2026-10-25T07:40:00"),
				id: 1,
				isCurrent: false,
				summary: "Note created",
			},
		]);
		communityMocks.listCommunityPublishingResources.mockResolvedValue([]);
		const onRestoreVersion = vi.fn();
		renderDetails(onRestoreVersion);

		expect(await screen.findByText("Current version")).toBeTruthy();
		expect(screen.getByText("Note created")).toBeTruthy();
		const restoreButtons = screen.getAllByRole("button", { name: /Restore/ });
		expect(restoreButtons).toHaveLength(1);

		fireEvent.click(restoreButtons[0] as HTMLElement);
		expect(onRestoreVersion).toHaveBeenCalledWith(1);
	});

	it("shows unsaved-to-history edits as the current version", async () => {
		noteMocks.listNoteVersions.mockResolvedValue([
			{
				createdAt: new Date("2026-10-25T07:40:00"),
				id: 1,
				isCurrent: false,
				summary: null,
			},
		]);
		communityMocks.listCommunityPublishingResources.mockResolvedValue([]);
		renderDetails();

		expect(await screen.findByText("Current version")).toBeTruthy();
		expect(screen.getByText("Autosave")).toBeTruthy();
	});

	it("says when a copy of the note is shared to Community", async () => {
		noteMocks.listNoteVersions.mockResolvedValue([]);
		communityMocks.listCommunityPublishingResources.mockResolvedValue([
			{ excerpt: "", id: 9, isPublished: true, title: "", type: "note" },
		]);
		renderDetails();

		expect(
			await screen.findByText(
				"A copy is shared in Community. This note stays yours.",
			),
		).toBeTruthy();
	});
});
