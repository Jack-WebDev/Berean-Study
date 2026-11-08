import type { ReaderChapter, ReaderTranslation } from "@berean-study/db/reader";
import {
	defaultReadingPreferences,
	type ReadingPreferences,
} from "@berean-study/db/reader-catalogue";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
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

const server = vi.hoisted(() => ({
	getChapterMarks: vi.fn(),
	getReaderChapter: vi.fn(),
	getReadingPlace: vi.fn(),
	getReadingPreferences: vi.fn(),
	listReaderTranslations: vi.fn(),
	listRecentChapters: vi.fn(),
	recordChapterVisit: vi.fn(),
	saveReadingPlace: vi.fn(),
	saveReadingPreferences: vi.fn(),
}));

vi.mock("@/functions/reader", () => server);

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
		search: _search,
		to,
		...props
	}: {
		children?: ReactNode;
		params?: { book: string; chapter: number };
		search?: unknown;
		to: string;
	}) => (
		<a
			href={
				params
					? to
							.replace("$book", params.book)
							.replace("$chapter", String(params.chapter))
					: to
			}
			{...props}
		>
			{children}
		</a>
	),
	useNavigate: () => vi.fn(),
}));

import { ReaderPage } from "../src/components/reader/reader-page";

const kjv: ReaderTranslation = {
	abbreviation: "KJV",
	available: true,
	copyrightNotice:
		"Scripture from the King James Version (KJV). Public domain in most countries.",
	id: 1,
	name: "King James Version",
};

function romans(
	chapter: number,
	overrides: Partial<ReaderChapter> = {},
): ReaderChapter {
	return {
		book: { name: "Romans", slug: "romans", testament: "new" },
		chapter,
		chapterCount: 16,
		label: `Romans ${chapter}`,
		missingVerses: [],
		next: chapter < 16 ? chapter + 1 : null,
		previous: chapter > 1 ? chapter - 1 : null,
		status: "available",
		translation: kjv,
		verses: [
			{
				number: 28,
				text: "And we know that all things work together for good.",
			},
			{
				number: 29,
				text: "For whom he did foreknow, he also did predestinate.",
			},
			{
				number: 30,
				text: "Moreover whom he did predestinate, them he also called.",
			},
		],
		...overrides,
	} as ReaderChapter;
}

beforeAll(() => {
	// jsdom has no layout, so these browser features are stood in for.
	globalThis.ResizeObserver = class {
		disconnect() {}
		observe() {}
		unobserve() {}
	};
	Element.prototype.scrollIntoView = vi.fn();
	window.scrollTo = vi.fn();
});

beforeEach(() => {
	server.getReadingPreferences.mockResolvedValue(defaultReadingPreferences);
	server.getReadingPlace.mockResolvedValue(null);
	server.listReaderTranslations.mockResolvedValue([
		kjv,
		{
			...kjv,
			abbreviation: "NIV",
			available: false,
			id: 4,
			name: "New International Version",
		},
	]);
	server.getChapterMarks.mockResolvedValue({
		highlighted: [],
		noted: [],
		study: [{ groups: ["explanation"], verse: 28 }],
	});
	server.listRecentChapters.mockResolvedValue([]);
	server.recordChapterVisit.mockResolvedValue(undefined);
	server.saveReadingPlace.mockResolvedValue(undefined);
	server.saveReadingPreferences.mockImplementation(
		async ({ data }: { data: Partial<ReadingPreferences> }) => ({
			...defaultReadingPreferences,
			...data,
		}),
	);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	window.localStorage.clear();
});

function renderReader(
	chapter: ReaderChapter | null,
	props: Partial<Parameters<typeof ReaderPage>[0]> = {},
) {
	server.getReaderChapter.mockResolvedValue(chapter);
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<ReaderPage
				arrivedFromSearch={false}
				bookSlug="romans"
				chapter={chapter?.chapter ?? 8}
				translationAbbreviation={undefined}
				verse={undefined}
				{...props}
			/>
		</QueryClientProvider>,
	);
}

const verseButton = (text: RegExp) =>
	screen.getByRole("button", { name: text });

describe("reading page", () => {
	it("opens as just Scripture, with labelled tools and no study panel", async () => {
		renderReader(romans(8));

		expect(
			await screen.findByRole("button", { name: "Romans 8, choose a chapter" }),
		).toBeTruthy();
		for (const tool of ["Translation", "Text size", "Options"]) {
			expect(screen.getByRole("button", { name: tool })).toBeTruthy();
		}
		expect(screen.getByRole("link", { name: "Compare" })).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "Books" }).getAttribute("href"),
		).toBe("/bible");
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(verseButton(/^28 And we know/).getAttribute("aria-pressed")).toBe(
			"false",
		);
	});

	it("tells screen readers which verses have study notes", async () => {
		renderReader(romans(8));
		const verse = await screen.findByRole("button", {
			name: /And we know that all things work together for good\. \(has study notes\)/,
		});
		expect(verse).toBeTruthy();
		expect(verseButton(/^29 For whom/).textContent).not.toContain(
			"study notes",
		);
	});

	it("chooses and unchooses a verse with a tap", async () => {
		renderReader(romans(8));
		const verse = await screen.findByRole("button", { name: /^29 For whom/ });

		fireEvent.click(verse);
		expect(verse.getAttribute("aria-pressed")).toBe("true");
		fireEvent.click(verse);
		expect(verse.getAttribute("aria-pressed")).toBe("false");
	});

	it("changes the words' size the moment a size is tapped, and saves it", async () => {
		renderReader(romans(8));
		fireEvent.click(await screen.findByRole("button", { name: "Text size" }));
		const sheet = await screen.findByRole("dialog", { name: "Text size" });
		const text = () =>
			verseButton(/^28 And we know/).querySelector(
				".font-serif",
			) as HTMLElement;
		expect(text().style.fontSize).toBe("22px");

		fireEvent.click(within(sheet).getByRole("radio", { name: "Largest" }));

		// The query library redraws on its next tick, a few milliseconds later.
		await waitFor(() => expect(text().style.fontSize).toBe("28px"));
		await waitFor(() =>
			expect(server.saveReadingPreferences).toHaveBeenCalledWith({
				data: { textSize: "largest" },
			}),
		);
	});

	it("keeps Previous and Next on screen, labelled even when there's nowhere to go", async () => {
		renderReader(romans(1));
		const chapters = await screen.findByRole("navigation", {
			name: "Chapters",
		});

		const first = within(chapters).getByRole("button", {
			name: "First chapter",
		});
		expect((first as HTMLButtonElement).disabled).toBe(true);
		expect(
			within(chapters)
				.getByRole("link", { name: "Romans 2" })
				.getAttribute("href"),
		).toBe("/bible/romans/2");
	});

	it("ends the chapter with Next, Previous and the translation's copyright line", async () => {
		renderReader(romans(8));
		const end = await screen.findByRole("region", { name: "End of chapter" });

		expect(within(end).getByText("End of Romans 8")).toBeTruthy();
		expect(
			within(end)
				.getByRole("link", { name: "Next: Romans 9" })
				.getAttribute("href"),
		).toBe("/bible/romans/9");
		expect(
			within(end).getByRole("link", { name: "Previous: Romans 7" }),
		).toBeTruthy();
		expect(
			within(end).getByText(/Public domain in most countries/),
		).toBeTruthy();
	});

	it("explains a skipped verse under the verse it belongs to", async () => {
		renderReader(
			romans(8, {
				missingVerses: [
					{
						afterVerse: 29,
						explanation: "Some Bibles split this verse in two.",
						question: "Why is there no verse 31?",
					},
				],
			} as Partial<ReaderChapter>),
		);
		const note = await screen.findByText("Why is there no verse 31?");
		const items = screen.getAllByRole("listitem");
		const noteIndex = items.findIndex((item) => item.contains(note));

		expect(items[noteIndex - 1]?.textContent).toContain(
			"For whom he did foreknow",
		);
	});

	it("still reads verse numbers to screen readers when they're hidden", async () => {
		server.getReadingPreferences.mockResolvedValue({
			...defaultReadingPreferences,
			showVerseNumbers: false,
		});
		renderReader(romans(8));
		expect(
			await screen.findByRole("button", { name: /^Verse 28 And we know/ }),
		).toBeTruthy();
	});

	it("picks up where the reader left off, with a way back to verse 1", async () => {
		server.getReadingPlace.mockResolvedValue({
			book: { name: "Romans", slug: "romans" },
			chapter: 8,
			label: "Romans 8",
			translationAbbreviation: "KJV",
			updatedAt: new Date(),
			verse: 29,
		});
		renderReader(romans(8));

		const notice = await screen.findByText("Picked up where you left off");
		expect(notice.parentElement?.textContent).toContain("Romans 8, verse 29");
		await waitFor(() =>
			expect(Element.prototype.scrollIntoView).toHaveBeenCalled(),
		);

		fireEvent.click(screen.getByRole("button", { name: "Start at verse 1" }));
		expect(screen.queryByText("Picked up where you left off")).toBeNull();
	});

	it("keeps the notice for Tab, so keyboard users can reach its button, but not for scrolling", async () => {
		server.getReadingPlace.mockResolvedValue({
			book: { name: "Romans", slug: "romans" },
			chapter: 8,
			label: "Romans 8",
			translationAbbreviation: "KJV",
			updatedAt: new Date(),
			verse: 29,
		});
		renderReader(romans(8));
		await screen.findByText("Picked up where you left off");

		fireEvent.keyDown(window, { key: "Tab" });
		expect(screen.getByText("Picked up where you left off")).toBeTruthy();
		fireEvent.keyDown(window, { key: "PageDown" });
		await waitFor(() =>
			expect(screen.queryByText("Picked up where you left off")).toBeNull(),
		);
	});

	it("marks the verse arrived at from a search", async () => {
		renderReader(romans(8), { arrivedFromSearch: true, verse: 28 });

		const notice = await screen.findByText(/is marked below/);
		expect(notice.textContent).toBe(
			"Romans 8:28 is marked below. Tap it to highlight, add a note or study it.",
		);
		expect(verseButton(/^28 And we know/).className).toContain(
			"bg-verse-target",
		);
	});

	it("says kindly when a chapter isn't published yet", async () => {
		renderReader({
			...romans(7),
			nearestAvailable: 8,
			status: "not_available",
		} as ReaderChapter);

		expect(
			await screen.findByText("Romans 7 isn't available yet"),
		).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: "Back to Romans 8" })
				.getAttribute("href"),
		).toBe("/bible/romans/8");
		expect(
			screen.getByRole("button", { name: "Choose another chapter" }),
		).toBeTruthy();
	});

	it("explains a chapter that can't exist", async () => {
		renderReader(null, { chapter: 17 });
		expect(await screen.findByText("We can't find that chapter")).toBeTruthy();
	});

	it("lists every translation, and says why the others aren't ready", async () => {
		renderReader(romans(8));
		fireEvent.click(await screen.findByRole("button", { name: "Translation" }));
		const sheet = await screen.findByRole("dialog", { name: "Translation" });

		expect(
			within(sheet).getByText("KJV · You're reading this one"),
		).toBeTruthy();
		expect(within(sheet).getByText("Not available yet")).toBeTruthy();
		expect(within(sheet).getByText("New International Version")).toBeTruthy();
		expect(
			within(sheet).queryByRole("button", { name: /New International/ }),
		).toBeNull();
	});

	it("lists every chapter, marking the one being read", async () => {
		renderReader(romans(8));
		fireEvent.click(
			await screen.findByRole("button", { name: "Romans 8, choose a chapter" }),
		);
		const sheet = await screen.findByRole("dialog", { name: "Romans" });

		const chapters = within(sheet).getAllByRole("link", {
			name: /^Romans \d+$/,
		});
		expect(chapters).toHaveLength(16);
		expect(
			within(sheet)
				.getByRole("link", { name: "Romans 8" })
				.getAttribute("aria-current"),
		).toBe("page");
	});
});
