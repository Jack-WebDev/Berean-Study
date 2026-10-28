import type { RichTextDocument } from "@berean-study/rich-text-editor";
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({
	arrange: vi.fn(),
	detail: null as unknown,
	markOpened: vi.fn(),
	setRead: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		hash: _hash,
		params: _params,
		search: _search,
		to,
		...props
	}: {
		children: ReactNode;
		hash?: string;
		params?: unknown;
		search?: unknown;
		to: string;
	}) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
	useLocation: () => "",
	useNavigate: () => vi.fn(),
}));

vi.mock("@/functions/collections", () => ({
	addPassageToCollection: vi.fn(),
	arrangeCollectionPassages: server.arrange,
	createCollectionSection: vi.fn(),
	deleteCollection: vi.fn(),
	deleteCollectionSection: vi.fn(),
	getCollectionDetail: async () => server.detail,
	markCollectionOpened: server.markOpened,
	moveCollectionSection: vi.fn(),
	removeNoteFromCollection: vi.fn(),
	removePassageFromCollection: vi.fn(),
	renameCollectionSection: vi.fn(),
	setCollectionPassageRead: server.setRead,
	setCollectionPinned: vi.fn(),
	updateCollection: vi.fn(),
}));
vi.mock("@/functions/notes", () => ({ deleteNote: vi.fn() }));
vi.mock("@/components/notes/note-study-data", () => ({
	filterPassageOptions: () => [],
	usePassageOptions: () => ({ data: [] }),
}));

import { CollectionDetailPage } from "../src/components/collections/collection-detail-page";
import {
	buildColumns,
	findUpNext,
	movePassage,
	toGroups,
	visiblePassageIds,
} from "../src/components/collections/collection-passage-model";
import type {
	CollectionDetail,
	CollectionPassage,
} from "../src/components/collections/use-collection-actions";
import { renderWithQueryClient } from "./render-with-query-client";

beforeAll(() => {
	// jsdom doesn't lay out pages, so it has no scrollIntoView.
	Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
	cleanup();
	server.arrange.mockReset();
	server.markOpened.mockReset();
	server.setRead.mockReset();
});

const read = new Date("2026-10-20T10:00:00Z");

function passage(
	passageId: number,
	sectionId: number | null,
	isRead = false,
): CollectionPassage {
	return {
		addedAt: read,
		passageId,
		readAt: isRead ? read : null,
		reference: `Psalm ${passageId}:1`,
		sectionId,
		title: null,
		verses: [{ chapter: passageId, number: 1, text: `Verse of ${passageId}` }],
	};
}

function doc(text: string): RichTextDocument {
	return {
		content: [{ content: [{ text, type: "text" }], type: "paragraph" }],
		type: "doc",
	};
}

const sections = [
	{ id: 10, title: "I. Crying out" },
	{ id: 20, title: "II. From the depths" },
];
// Reading order: section I (13, 22, 6 — all read), then II (88 next, 130).
const passages = [
	passage(13, 10, true),
	passage(22, 10, true),
	passage(6, 10, true),
	passage(88, 20),
	passage(130, 20),
];

describe("collection passage layout", () => {
	it("groups passages by section and hides an empty unsectioned group", () => {
		const columns = buildColumns(passages, sections);
		expect(columns.map((column) => [column.key, column.ids])).toEqual([
			["section-10", [13, 22, 6]],
			["section-20", [88, 130]],
		]);
		expect(buildColumns([passage(1, null)], [])[0]?.key).toBe("unsectioned");
	});

	it("finds the first unread passage as up next", () => {
		expect(findUpNext(passages)?.passageId).toBe(88);
		expect(findUpNext([passage(1, null, true)])).toBeNull();
	});

	it("moves a passage within and between sections", () => {
		const columns = buildColumns(passages, sections);
		const within = movePassage(columns, 88, "section-20", 1);
		expect(within[1]?.ids).toEqual([130, 88]);

		const between = movePassage(columns, 6, "section-20", 0);
		expect(toGroups(between)).toEqual([
			{ passageIds: [13, 22], sectionId: 10 },
			{ passageIds: [6, 88, 130], sectionId: 20 },
		]);

		const out = movePassage(columns, 130, "unsectioned", 99);
		expect(toGroups(out)[0]).toEqual({ passageIds: [130], sectionId: null });
	});

	it("folds a finished section down to two passages", () => {
		const [finished, open] = buildColumns(passages, sections);
		const readIds = new Set([13, 22, 6]);
		if (!finished || !open) throw new Error("Expected two sections.");
		expect(visiblePassageIds(finished, readIds, false)).toEqual([13, 22]);
		expect(visiblePassageIds(finished, readIds, true)).toEqual([13, 22, 6]);
		expect(visiblePassageIds(open, readIds, false)).toEqual([88, 130]);
	});
});

describe("collection detail page", () => {
	function renderDetail() {
		server.detail = {
			collection: {
				color: "#e4ebdf",
				cover: { passageId: 13, reference: "Psalm 13:1", text: "Verse" },
				createdAt: read,
				description: "Honest prayers from the Psalter.",
				id: 1,
				lastOpenedAt: null,
				name: "Psalms of Lament",
				noteCount: 1,
				passageCount: 5,
				pinned: false,
				progress: 60,
				readCount: 3,
				tags: ["psalms"],
				type: "project",
				updatedAt: read,
				visibility: "private",
			},
			notes: [
				{
					bookName: "Psalms",
					content: doc("Heman keeps praying with no answer."),
					id: 7,
					passageIds: [88],
					passageTitle: null,
					status: "saved",
					title: "Day and night",
					updatedAt: read,
				},
			],
			passages,
			sections,
			translation: "KJV",
		} satisfies CollectionDetail;
		renderWithQueryClient(
			<CollectionDetailPage
				collectionId={1}
				onTabChange={vi.fn()}
				tab="passages"
			/>,
		);
	}

	it("shows sections, read marks, up next and notes under their passage", async () => {
		renderDetail();

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Psalms of Lament",
			}),
		).toBeTruthy();
		expect(server.markOpened).toHaveBeenCalledTimes(1);

		const first = screen.getByRole("region", { name: "I. Crying out" });
		expect(within(first).getByText("3 of 3 read")).toBeTruthy();
		expect(within(first).getAllByText("Read")).toHaveLength(2);
		expect(
			within(first).getByRole("button", { name: "Show 1 more read passage" }),
		).toBeTruthy();

		const next = screen.getByRole("article", { name: "Up next: Psalm 88:1" });
		expect(within(next).getByText("Day and night.")).toBeTruthy();
		expect(
			within(next).getByRole("link", { name: "Add note" }).getAttribute("href"),
		).toBe("/library/notes/new");

		expect(
			screen
				.getByRole("link", { name: /Continue at Psalm 88:1/ })
				.getAttribute("href"),
		).toBe("#passage-88");
		expect(
			screen.getByRole("progressbar", { name: "Study progress" }),
		).toBeTruthy();
	});

	it("marks the up-next passage as read", async () => {
		server.setRead.mockResolvedValue(undefined);
		renderDetail();

		const next = await screen.findByRole("article", {
			name: "Up next: Psalm 88:1",
		});
		fireEvent.click(within(next).getByRole("button", { name: "Mark as read" }));

		await waitFor(() =>
			expect(server.setRead).toHaveBeenCalledWith({
				data: { id: 1, passageId: 88, read: true },
			}),
		);
	});

	it("gives every drag handle and menu an accessible name", async () => {
		renderDetail();

		expect(
			await screen.findByRole("button", { name: "Move Psalm 130:1" }),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Options for Psalm 130:1" }),
		).toBeTruthy();
		expect(
			screen.getByRole("button", {
				name: "Options for section II. From the depths",
			}),
		).toBeTruthy();
	});
});
