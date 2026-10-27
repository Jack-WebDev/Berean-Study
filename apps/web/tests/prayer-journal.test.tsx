import type { PrayerDetail, Reflection } from "@berean-study/db/prayers";
import type { RichTextDocument } from "@berean-study/rich-text-editor";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const navigate = vi.hoisted(() => vi.fn());
const server = vi.hoisted(() => ({
	counts: { prayers: 0, reflections: 0, testimonies: 0 },
	prayers: [] as unknown[],
	reflections: [] as unknown[],
}));

vi.mock("@tanstack/react-router", () => ({
	// Renders the destination, including search params, so tests can check
	// where each link goes.
	Link: ({
		children,
		params,
		replace: _replace,
		search,
		to,
		...props
	}: {
		children: ReactNode;
		params?: Record<string, number>;
		replace?: boolean;
		search?: Record<string, number | string>;
		to: string;
	}) => {
		const path = Object.entries(params ?? {}).reduce(
			(current, [key, value]) => current.replace(`$${key}`, String(value)),
			to,
		);
		const query = new URLSearchParams(
			Object.entries(search ?? {}).map(([key, value]) => [key, String(value)]),
		).toString();
		return (
			<a href={query ? `${path}?${query}` : path} {...props}>
				{children}
			</a>
		);
	},
	useNavigate: () => navigate,
}));

vi.mock("@/functions/prayer-journal", () => ({
	getPrayerJournalCounts: async () => server.counts,
	getReflectionReminder: async () => false,
	setReflectionReminder: vi.fn(),
}));
vi.mock("@/functions/prayers", () => ({
	addPrayerUpdate: vi.fn(),
	createPrayer: vi.fn(),
	deletePrayer: vi.fn(),
	getPrayer: async ({ data }: { data: { id: number } }) => ({
		...(server.prayers as PrayerDetail[]).find(
			(prayer) => prayer.id === data.id,
		),
		updates: [],
	}),
	listPrayers: async () => server.prayers,
	listPrayersReadyForReflection: async () => [],
}));
vi.mock("@/functions/reflections", () => ({
	getReflection: vi.fn(),
	listReflections: async () => server.reflections,
}));
vi.mock("@/components/notes/note-study-data", () => ({
	filterPassageOptions: () => [],
	useLoadVerses: () => async () => [],
	usePassageOptions: () => ({ data: [] }),
	usePassageText: () => ({ data: null }),
	useTranslations: () => ({ data: [] }),
}));

import { FormDraftsProvider } from "../src/components/form-drafts";
import { PrayersTab } from "../src/components/journal/prayers-tab";
import { ReflectionsTab } from "../src/components/journal/reflections-tab";
import { renderWithQueryClient } from "./render-with-query-client";

beforeAll(() => {
	// jsdom doesn't lay out pages; the editor and list ask for positions.
	Element.prototype.scrollIntoView = vi.fn();
	const rect = () => new DOMRect(0, 0, 0, 0);
	Range.prototype.getBoundingClientRect = rect;
	Range.prototype.getClientRects = () => [rect()] as unknown as DOMRectList;
});

afterEach(() => {
	cleanup();
	navigate.mockReset();
	server.counts = { prayers: 0, reflections: 0, testimonies: 0 };
	server.prayers = [];
	server.reflections = [];
});

function doc(text: string): RichTextDocument {
	return {
		content: [{ content: [{ text, type: "text" }], type: "paragraph" }],
		type: "doc",
	};
}

function prayer(
	overrides: Partial<PrayerDetail> & { id: number },
): PrayerDetail {
	return {
		category: "Guidance",
		content: doc("Lord, give me wisdom to lead well."),
		createdAt: new Date("2026-10-03T09:00:00"),
		passages: [],
		prayingFor: null,
		reflectionCount: 0,
		title: `Prayer ${overrides.id}`,
		updateCount: 0,
		updatedAt: new Date("2026-10-03T09:00:00"),
		updates: [],
		...overrides,
	};
}

function renderPrayers(search = {}) {
	return renderWithQueryClient(
		<FormDraftsProvider>
			<PrayersTab onSearchChange={vi.fn()} search={search} />
		</FormDraftsProvider>,
	);
}

describe("Prayer Journal tabs", () => {
	it("links the three tabs to their own pages and marks the current one", async () => {
		server.counts = { prayers: 2, reflections: 1, testimonies: 0 };
		server.prayers = [prayer({ id: 1 }), prayer({ id: 2 })];
		renderPrayers();

		const tabs = screen.getByRole("navigation", { name: "Journal sections" });
		const prayersTab = await within(tabs).findByRole("link", {
			name: /Prayers/,
		});
		expect(prayersTab.getAttribute("aria-current")).toBe("page");
		expect(prayersTab.getAttribute("href")).toBe("/library/prayers");
		expect(
			within(tabs)
				.getByRole("link", { name: /Testimonies/ })
				.getAttribute("href"),
		).toBe("/library/testimonies");
		expect(
			within(tabs)
				.getByRole("link", { name: /Reflections/ })
				.getAttribute("aria-current"),
		).toBeNull();
		expect(await within(prayersTab).findByText("2")).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "New prayer" }).getAttribute("href"),
		).toBe("/library/prayers/new");
	});
});

describe("Prayers tab", () => {
	it("starts with a composer instead of an empty selection panel", async () => {
		renderPrayers();

		expect(
			await screen.findByRole("heading", {
				name: "What’s on your heart today?",
			}),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "Save prayer" })).toBeTruthy();
		expect(screen.queryByText(/Select a/)).toBeNull();
	});

	it("selects a prayer and offers to write a reflection linked to it", async () => {
		server.prayers = [
			prayer({ id: 1, title: "Wisdom for the new role" }),
			prayer({ category: "Thanksgiving", id: 2, title: "Small group" }),
		];
		renderPrayers({ prayer: 2 });

		const list = await screen.findByRole("list", { name: "Prayers" });
		const selected = within(list).getByRole("button", { current: true });
		expect(selected.textContent).toContain("Small group");
		expect(
			screen.getByRole("heading", { level: 2, name: "Small group" }),
		).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: "Write a reflection" })
				.getAttribute("href"),
		).toBe("/library/reflections/new?prayerId=2");
	});
});

describe("Reflections tab", () => {
	it("shows which prayer each reflection looks back on, grouped by month", async () => {
		server.counts = { prayers: 1, reflections: 1, testimonies: 0 };
		server.reflections = [
			{
				content: doc("Patience is the wisdom."),
				createdAt: new Date("2026-10-22T09:00:00"),
				id: 7,
				passages: [],
				prayer: {
					createdAt: new Date("2026-10-03T09:00:00"),
					id: 1,
					title: "Wisdom for the new role",
				},
				prompt: "What has changed since you first prayed this?",
			} satisfies Reflection,
		];
		renderWithQueryClient(
			<ReflectionsTab onSearchChange={vi.fn()} search={{}} />,
		);

		const chip = await screen.findByRole("link", {
			name: "Looking back on: Wisdom for the new role",
		});
		expect(chip.getAttribute("href")).toBe("/library/prayers?prayer=1");
		expect(screen.getByRole("heading", { name: "October 2026" })).toBeTruthy();
		expect(
			screen.getByText("What has changed since you first prayed this?"),
		).toBeTruthy();
		expect(screen.getByText("Patience is the wisdom.")).toBeTruthy();
	});

	it("explains reflections and offers two ways to start when there are none", async () => {
		renderWithQueryClient(
			<ReflectionsTab onSearchChange={vi.fn()} search={{}} />,
		);

		expect(
			await screen.findByRole("heading", { name: "Pause and remember" }),
		).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: "Write a free reflection" })
				.getAttribute("href"),
		).toBe("/library/reflections/new");
		expect(
			screen.getByRole("checkbox", { name: "Remind me to reflect monthly" }),
		).toBeTruthy();
	});
});
