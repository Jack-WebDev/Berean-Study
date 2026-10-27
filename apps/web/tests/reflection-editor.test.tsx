import type { PrayerDetail } from "@berean-study/db/prayers";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const createReflection = vi.hoisted(() => vi.fn());
const screenIsWide = vi.hoisted(() => ({ value: true }));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params: _params,
		replace: _replace,
		search: _search,
		to,
		...props
	}: {
		children: ReactNode;
		params?: unknown;
		replace?: boolean;
		search?: unknown;
		to: string;
	}) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
	useNavigate: () => vi.fn(),
}));
vi.mock("@/functions/prayers", () => ({
	getPrayer: async () => prayer,
}));
vi.mock("@/functions/reflections", () => ({
	createReflection,
	getReflection: vi.fn(),
	updateReflection: vi.fn(),
}));
vi.mock("@/functions/prayer-journal", () => ({
	getPrayerJournalCounts: async () => ({}),
	getReflectionReminder: async () => false,
}));
vi.mock("@/functions/passages", () => ({
	getVerseRangeText: async () => [],
}));
vi.mock("@/components/notes/note-study-data", () => ({
	filterPassageOptions: () => [],
	useLoadVerses: () => async () => [],
	usePassageOptions: () => ({ data: [] }),
	usePassageText: () => ({ data: null }),
	useTranslations: () => ({ data: [] }),
}));

import { ReflectionEditorPage } from "../src/components/journal/reflection-editor-page";
import { renderWithQueryClient } from "./render-with-query-client";

const prayer: PrayerDetail = {
	category: "Guidance",
	content: {
		content: [
			{
				content: [{ text: "Lord, give me wisdom to lead well.", type: "text" }],
				type: "paragraph",
			},
		],
		type: "doc",
	},
	createdAt: new Date("2026-10-03T09:00:00"),
	id: 4,
	passages: [],
	prayingFor: null,
	reflectionCount: 0,
	title: "Wisdom for the new role",
	updateCount: 1,
	updatedAt: new Date("2026-10-03T09:00:00"),
	updates: [
		{
			createdAt: new Date("2026-10-21T09:00:00"),
			id: 1,
			prayerId: 4,
			text: "First team meeting went better than expected.",
		},
	],
};

beforeAll(() => {
	const rect = () => new DOMRect(0, 0, 0, 0);
	Range.prototype.getBoundingClientRect = rect;
	Range.prototype.getClientRects = () => [rect()] as unknown as DOMRectList;
	// jsdom has no media queries; tests choose the screen width.
	window.matchMedia = (query: string) =>
		({
			addEventListener: () => undefined,
			matches: query.includes("min-width: 1200px") && screenIsWide.value,
			media: query,
			removeEventListener: () => undefined,
		}) as unknown as MediaQueryList;
});

beforeEach(() => {
	window.localStorage.clear();
	screenIsWide.value = true;
});

afterEach(() => {
	cleanup();
	createReflection.mockReset();
});

function renderNewReflection(prayerId?: number) {
	return renderWithQueryClient(<ReflectionEditorPage prayerId={prayerId} />);
}

describe("Reflection editor", () => {
	it("starts empty, with the guiding question only as faded placeholder text", async () => {
		const { container } = renderNewReflection(4);
		const writing = await screen.findByRole("textbox", { name: "Reflection" });

		expect(writing.textContent).toBe("");
		expect(container.querySelector(".ProseMirror h2")).toBeNull();
		expect(writing.querySelector("p")?.getAttribute("data-placeholder")).toBe(
			"What has changed since you first prayed this?",
		);
		// Opening the page alone must not create a reflection.
		await new Promise((resolve) => setTimeout(resolve, 1500));
		expect(createReflection).not.toHaveBeenCalled();
	});

	it("offers only the four labelled buttons and none of the removed extras", async () => {
		renderNewReflection(4);
		const toolbar = await screen.findByRole("toolbar", { name: "Formatting" });

		expect(
			[...toolbar.querySelectorAll("button")].map((button) =>
				button.textContent?.trim(),
			),
		).toEqual(["Bold", "Italic", "List", "Add a verse"]);
		for (const removed of [
			/Try another question/,
			/Shortcuts/,
			/Verses in this entry/,
			/type \//,
		])
			expect(screen.queryByText(removed)).toBeNull();
	});

	it("shows the prayer beside the writing, and remembers when it's hidden", async () => {
		const first = renderNewReflection(4);
		const hide = await screen.findByRole("button", { name: "Hide prayer" });

		expect(hide.getAttribute("aria-pressed")).toBe("true");
		expect(
			screen.getByRole("heading", { name: "Wisdom for the new role" }),
		).toBeTruthy();
		expect(screen.getByText("Along the way")).toBeTruthy();
		expect(
			screen.getByText("First team meeting went better than expected."),
		).toBeTruthy();

		fireEvent.click(hide);
		const show = screen.getByRole("button", { name: "Show prayer" });
		expect(show.getAttribute("aria-pressed")).toBe("false");
		expect(screen.queryByText("Along the way")).toBeNull();

		first.unmount();
		renderNewReflection(4);
		expect(
			(await screen.findByRole("button", { name: "Show prayer" })).getAttribute(
				"aria-pressed",
			),
		).toBe("false");
	});

	it("keeps the prayer hidden on narrow screens until asked for", async () => {
		screenIsWide.value = false;
		renderNewReflection(4);

		const show = await screen.findByRole("button", { name: "Show prayer" });
		expect(screen.queryByText("Along the way")).toBeNull();
		fireEvent.click(show);
		await waitFor(() => expect(screen.getByText("Along the way")).toBeTruthy());
	});

	it("shows no prayer panel or toggle for a free reflection", async () => {
		renderNewReflection();
		await screen.findByRole("textbox", { name: "Reflection" });

		expect(screen.queryByRole("button", { name: /prayer$/ })).toBeNull();
		expect(screen.queryByText("Looking back on")).toBeNull();
	});
});
