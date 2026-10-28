import type {
	CollectionLibrary,
	CollectionSummary,
} from "@berean-study/db/collections";
import {
	act,
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigate = vi.hoisted(() => vi.fn());
const server = vi.hoisted(() => ({
	createCollection: vi.fn(),
	library: { collections: [], continueStudying: null } as CollectionLibrary,
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
	useNavigate: () => navigate,
}));

vi.mock("@/functions/collections", () => ({
	createCollection: server.createCollection,
	getCollectionLibrary: async () => server.library,
	setCollectionPinned: vi.fn(),
	updateCollection: vi.fn(),
}));

import {
	countByFilter,
	filterCollections,
	sortCollections,
	summarizeLibrary,
} from "../src/components/collections/collection-library";
import { CollectionsPage } from "../src/components/collections/collections-page";
import { renderWithQueryClient } from "./render-with-query-client";

afterEach(() => {
	cleanup();
	navigate.mockReset();
	server.createCollection.mockReset();
	server.library = { collections: [], continueStudying: null };
});

function collection(
	overrides: Partial<CollectionSummary> & { id: number; name: string },
): CollectionSummary {
	return {
		color: "#e4ebdf",
		cover: null,
		createdAt: new Date("2026-10-01T10:00:00Z"),
		description: "",
		lastOpenedAt: null,
		noteCount: 0,
		passageCount: 0,
		pinned: false,
		progress: null,
		readCount: 0,
		tags: [],
		type: "list",
		updatedAt: new Date("2026-10-20T10:00:00Z"),
		visibility: "private",
		...overrides,
	};
}

const lament = collection({
	cover: { passageId: 13, reference: "Psalm 13:1", text: "How long?" },
	description: "Honest prayers from the Psalter.",
	id: 1,
	name: "Psalms of Lament",
	noteCount: 8,
	passageCount: 12,
	progress: 58,
	readCount: 7,
	tags: ["psalms", "prayer"],
	type: "project",
	updatedAt: new Date("2026-10-27T10:00:00Z"),
});
const sermon = collection({
	id: 2,
	name: "Sermon on the Mount",
	passageCount: 18,
	pinned: true,
	type: "teaching",
	updatedAt: new Date("2026-10-01T10:00:00Z"),
	visibility: "shared",
});
const fruit = collection({
	id: 3,
	name: "Fruit of the Spirit",
	passageCount: 9,
	tags: ["character"],
});
const all = [lament, sermon, fruit];

describe("collection library rules", () => {
	it("filters by type, pinned and shared", () => {
		expect(filterCollections(all, "project", "").map((c) => c.id)).toEqual([1]);
		expect(filterCollections(all, "pinned", "").map((c) => c.id)).toEqual([2]);
		expect(filterCollections(all, "shared", "").map((c) => c.id)).toEqual([2]);
		expect(countByFilter(all)).toEqual({
			all: 3,
			list: 1,
			pinned: 1,
			project: 1,
			shared: 1,
			teaching: 1,
		});
	});

	it("searches names, descriptions, tags and the cover passage", () => {
		const ids = (query: string) =>
			filterCollections(all, "all", query).map((c) => c.id);
		expect(ids("psalm 13")).toEqual([1]);
		expect(ids("CHARACTER")).toEqual([3]);
		expect(ids("honest")).toEqual([1]);
		expect(ids("nothing like this")).toEqual([]);
	});

	it("sorts pinned first by update, then by name or size", () => {
		const ids = (sort: "updated" | "name" | "size") =>
			sortCollections(all, sort).map((c) => c.id);
		expect(ids("updated")).toEqual([2, 1, 3]);
		expect(ids("name")).toEqual([3, 1, 2]);
		expect(ids("size")).toEqual([2, 1, 3]);
	});

	it("summarises the library", () => {
		expect(summarizeLibrary(all)).toBe("3 collections · 39 passages · 8 notes");
		expect(summarizeLibrary([fruit])).toBe(
			"1 collection · 9 passages · 0 notes",
		);
	});
});

describe("collections page", () => {
	it("shows the first-run empty state when there are no collections", async () => {
		renderWithQueryClient(
			<CollectionsPage onSearchChange={vi.fn()} search={{}} />,
		);

		expect(
			await screen.findByRole("heading", {
				name: "Gather what you're studying",
			}),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Create your first collection" }),
		).toBeTruthy();
	});

	it("keeps the filter, sort and view in the URL, leaving defaults out", async () => {
		server.library = { collections: all, continueStudying: null };
		const onSearchChange = vi.fn();
		renderWithQueryClient(
			<CollectionsPage
				onSearchChange={onSearchChange}
				search={{ view: "list" }}
			/>,
		);

		const projects = await screen.findByRole("button", {
			name: /Study projects/,
		});
		expect(projects.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(projects);
		expect(onSearchChange).toHaveBeenLastCalledWith({
			filter: "project",
			sort: undefined,
			view: "list",
		});

		fireEvent.change(screen.getByLabelText("Sort"), {
			target: { value: "name" },
		});
		expect(onSearchChange).toHaveBeenLastCalledWith({
			filter: undefined,
			sort: "name",
			view: "list",
		});

		fireEvent.click(screen.getByRole("button", { name: "Grid view" }));
		expect(onSearchChange).toHaveBeenLastCalledWith({
			filter: undefined,
			sort: undefined,
			view: undefined,
		});
	});

	it("shows only the collections in the chosen filter, with counts", async () => {
		server.library = { collections: all, continueStudying: null };
		renderWithQueryClient(
			<CollectionsPage
				onSearchChange={vi.fn()}
				search={{ filter: "pinned" }}
			/>,
		);

		const list = await screen.findByRole("list", { name: "Your collections" });
		expect(
			within(list)
				.getAllByRole("heading", { level: 3 })
				.map((heading) => heading.textContent),
		).toEqual(["Sermon on the Mount"]);
		expect(
			screen
				.getByRole("button", { name: /Pinned/ })
				.getAttribute("aria-pressed"),
		).toBe("true");
		expect(screen.getByRole("button", { name: /^All/ }).textContent).toBe(
			"All3",
		);
	});

	it("offers to continue the last opened study project", async () => {
		server.library = {
			collections: all,
			continueStudying: {
				collectionId: 1,
				next: {
					passageId: 88,
					reference: "Psalm 88:1–3",
					text: "O LORD God of my salvation",
				},
				translation: "KJV",
			},
		};
		renderWithQueryClient(
			<CollectionsPage onSearchChange={vi.fn()} search={{}} />,
		);

		const card = await screen.findByRole("region", {
			name: "Continue studying",
		});
		expect(within(card).getByText("Psalm 88:1–3 · KJV")).toBeTruthy();
		expect(
			within(card).getByRole("progressbar", { name: "Study progress" }),
		).toBeTruthy();
		expect(
			within(card).getByRole("link", { name: /Resume/ }).textContent,
		).toContain("Psalms of Lament");
	});
});

describe("new collection dialog", () => {
	async function openFromTemplate(name: RegExp) {
		server.library = { collections: all, continueStudying: null };
		renderWithQueryClient(
			<CollectionsPage onSearchChange={vi.fn()} search={{}} />,
		);
		const trigger = await screen.findByRole("button", { name });
		act(() => trigger.focus());
		fireEvent.click(trigger);
		return { dialog: await screen.findByRole("dialog"), trigger };
	}

	it("preselects the template's type and focuses the name", async () => {
		const { dialog } = await openFromTemplate(/Teaching prep Outline/);

		const teaching = within(dialog).getByRole("radio", {
			name: /Teaching prep/,
		});
		expect(teaching.getAttribute("aria-checked")).toBe("true");
		await waitFor(() =>
			expect(document.activeElement).toBe(
				within(dialog).getByLabelText("Name"),
			),
		);
	});

	it("only offers Private until sharing exists", async () => {
		const { dialog } = await openFromTemplate(/Book study/);

		for (const name of [/^Shared/, /^Public/]) {
			const option = within(dialog).getByRole("radio", { name });
			expect(
				option.getAttribute("aria-disabled") ??
					option.getAttribute("data-disabled"),
			).not.toBeNull();
		}
	});

	it("closes on Escape and returns focus to the button that opened it", async () => {
		const { trigger } = await openFromTemplate(/Topical study/);

		fireEvent.keyDown(document.activeElement ?? document.body, {
			key: "Escape",
		});

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(trigger));
	});

	it("asks for a name, then creates the collection and opens it", async () => {
		server.createCollection.mockResolvedValue({ id: 42, name: "Lament" });
		const { dialog } = await openFromTemplate(/Book study/);

		fireEvent.click(
			within(dialog).getByRole("button", { name: "Create and add passages" }),
		);
		expect(
			await within(dialog).findByText("Enter a collection name."),
		).toBeTruthy();
		expect(server.createCollection).not.toHaveBeenCalled();

		fireEvent.change(within(dialog).getByLabelText("Name"), {
			target: { value: "Lament" },
		});
		fireEvent.click(within(dialog).getByRole("radio", { name: "Plum" }));
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Create and add passages" }),
		);

		await waitFor(() =>
			expect(navigate).toHaveBeenCalledWith({
				params: { collectionId: "42" },
				to: "/library/collections/$collectionId",
			}),
		);
		expect(server.createCollection).toHaveBeenCalledWith({
			data: {
				color: "#eadfe8",
				description: "",
				name: "Lament",
				tags: [],
				type: "project",
				visibility: "private",
			},
		});
	});
});
