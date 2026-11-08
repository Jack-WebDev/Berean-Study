import type { CanonBook } from "@berean-study/db/reader";
import type {
	AboutBook,
	BookPage as BookPageData,
} from "@berean-study/db/reader-books";
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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({
	getAboutBook: vi.fn(),
	getBookPage: vi.fn(),
	getContinueReading: vi.fn(),
	getReadingPreferences: vi.fn(),
	listCanonBooks: vi.fn(),
	listRecentChapters: vi.fn(),
	saveReadingPreferences: vi.fn(),
}));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@/functions/reader", () => server);

/** Links show the address they'd open, with any search, so tests can read it. */
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
		search,
		to,
		...props
	}: {
		children?: ReactNode;
		params?: Record<string, string | number>;
		search?: Record<string, string | number>;
		to: string;
	}) => {
		let href = to;
		for (const [key, value] of Object.entries(params ?? {})) {
			href = href.replace(`$${key}`, String(value));
		}
		const query = new URLSearchParams(
			Object.entries(search ?? {}).map(([key, value]) => [key, String(value)]),
		).toString();
		return (
			<a href={query ? `${href}?${query}` : href} {...props}>
				{children}
			</a>
		);
	},
	useNavigate: () => navigate,
}));

import { AboutBookPage } from "../src/components/bible/about-book-page";
import { BookPage } from "../src/components/bible/book-page";
import { BrowsePage } from "../src/components/bible/browse-page";

const book = (
	name: string,
	testament: "old" | "new",
	group: string,
	chapterCount: number,
	extra: Partial<CanonBook> = {},
): CanonBook => ({
	chapterCount,
	group,
	hasText: false,
	includedBy: [],
	name,
	notInEveryTradition: false,
	slug: name.toLowerCase().replaceAll(" ", "-"),
	testament,
	...extra,
});

const traditions = [
	{ hasList: true, name: "Protestant", slug: "protestant" },
	{ hasList: true, name: "Catholic", slug: "catholic" },
	{ hasList: true, name: "Eastern Orthodox", slug: "eastern-orthodox" },
	{
		hasList: false,
		name: "Ethiopian Orthodox Tewahedo",
		slug: "ethiopian-orthodox",
	},
];

function bookList(overrides: Record<string, unknown> = {}) {
	return {
		books: [
			book("Genesis", "old", "Law", 50, { hasText: true }),
			book("Exodus", "old", "Law", 40),
			book("Tobit", "old", "Deuterocanonical books", 14, {
				includedBy: ["Catholic", "Eastern Orthodox"],
				notInEveryTradition: true,
			}),
			book("John", "new", "Gospels", 21, { hasText: true }),
			book("Romans", "new", "Letters", 16),
		],
		tradition: { name: "Catholic", slug: "catholic" },
		traditions,
		usingFallbackList: false,
		...overrides,
	};
}

beforeEach(() => {
	server.getReadingPreferences.mockResolvedValue(defaultReadingPreferences);
	server.listCanonBooks.mockResolvedValue(bookList());
	server.getContinueReading.mockResolvedValue(null);
	server.listRecentChapters.mockResolvedValue([]);
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
});

function renderWithQueries(page: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>{page}</QueryClientProvider>,
	);
}

const href = (name: string | RegExp) =>
	screen.getByRole("link", { name }).getAttribute("href");

describe("Browse", () => {
	it("lists the books of the reader's tradition under their headings", async () => {
		renderWithQueries(<BrowsePage />);

		await screen.findByText("Showing the Catholic list.");
		const oldTestament = screen.getByRole("tabpanel");
		expect(
			within(oldTestament)
				.getAllByRole("heading", { level: 3 })
				.map((heading) => heading.textContent),
		).toEqual(["Law", "Deuterocanonical books"]);
		expect(
			within(oldTestament).getByText(
				"The beginning of the world and of Israel.",
			),
		).toBeTruthy();
		expect(href(/^Genesis/)).toBe("/bible/genesis");
		expect(within(oldTestament).getByText("50 chapters")).toBeTruthy();
		// Quiet notes: which Bibles have a book, and whether it can be read yet.
		expect(
			within(oldTestament).getByText(
				"In Catholic and Eastern Orthodox Bibles · Not available yet",
			),
		).toBeTruthy();
		expect(
			screen.getByRole("link", { name: /^Genesis/ }).textContent,
		).not.toContain("Not available yet");
	});

	it("switches testament and remembers the choice on the account", async () => {
		renderWithQueries(<BrowsePage />);
		fireEvent.click(await screen.findByRole("tab", { name: "New Testament" }));

		await waitFor(() =>
			expect(server.saveReadingPreferences).toHaveBeenCalledWith({
				data: { browseTestament: "new" },
			}),
		);
		expect(
			screen
				.getByRole("tab", { name: "New Testament" })
				.getAttribute("aria-selected"),
		).toBe("true");
		expect(href(/^John/)).toBe("/bible/john");
	});

	it("finds a verse as it's typed, and opens it with Enter", async () => {
		renderWithQueries(<BrowsePage />);
		await screen.findByText("Showing the Catholic list.");
		const box = screen.getByLabelText("Find a book or verse");

		fireEvent.change(box, { target: { value: "jn3:16" } });
		expect(href(/John 3:16/)).toBe("/bible/john/3?from=search&verse=16");
		expect(screen.getByText("Go straight to this verse")).toBeTruthy();

		fireEvent.keyDown(box, { key: "Enter" });
		expect(navigate).toHaveBeenCalledWith({
			params: { book: "john", chapter: 3 },
			search: { from: "search", verse: 16 },
			to: "/bible/$book/$chapter",
		});

		fireEvent.change(box, { target: { value: "zzz" } });
		expect(
			screen.getByText(
				"Nothing matches “zzz”. Try a book name, like John, or a verse, like John 3:16.",
			),
		).toBeTruthy();
	});

	it("offers a place to start on a first visit", async () => {
		renderWithQueries(<BrowsePage />);
		await screen.findByText("Not sure where to start?");
		expect(href("Start with John")).toBe("/bible/john");
	});

	it("offers to carry on reading for a returning reader", async () => {
		server.getContinueReading.mockResolvedValue({
			label: "Romans 8",
			place: { bookSlug: "romans", chapter: 8, verse: 28 },
			start: "And we know that all things work together for good…",
			translationName: "King James Version",
		});
		server.listRecentChapters.mockResolvedValue([
			{
				book: { name: "Romans", slug: "romans" },
				chapter: 8,
				label: "Romans 8",
			},
			{
				book: { name: "Psalms", slug: "psalms" },
				chapter: 23,
				label: "Psalm 23",
			},
		]);
		renderWithQueries(<BrowsePage />);

		await screen.findByText("Continue reading");
		expect(
			screen.getByText("“And we know that all things work together for good…”"),
		).toBeTruthy();
		expect(screen.getByText("Verse 28 · King James Version")).toBeTruthy();
		expect(href("Carry on reading")).toBe("/bible/romans/8?verse=28");
		// The chapter being continued isn't repeated among the recent ones.
		await screen.findByRole("link", { name: "Psalm 23" });
		expect(screen.queryByRole("link", { name: "Romans 8" })).toBeNull();
		expect(screen.queryByText("Not sure where to start?")).toBeNull();
	});

	it("changes the book list, and says when a tradition's list isn't ready", async () => {
		server.listCanonBooks.mockResolvedValue(
			bookList({
				tradition: {
					name: "Ethiopian Orthodox Tewahedo",
					slug: "ethiopian-orthodox",
				},
				usingFallbackList: true,
			}),
		);
		renderWithQueries(<BrowsePage />);
		await screen.findByText(
			"The Ethiopian Orthodox Tewahedo list isn't ready yet, so these are the books of the Protestant list.",
		);

		fireEvent.click(screen.getByRole("button", { name: "Change" }));
		const sheet = await screen.findByRole("dialog", {
			name: "Which book list?",
		});
		expect(
			within(sheet).getByText(
				"Not ready yet. Shows the Protestant list for now.",
			),
		).toBeTruthy();
		fireEvent.click(within(sheet).getByRole("radio", { name: /^Protestant/ }));
		await waitFor(() =>
			expect(server.saveReadingPreferences).toHaveBeenCalledWith({
				data: { traditionSlug: "protestant" },
			}),
		);
	});

	it("says kindly when an older link's verses can't be found", async () => {
		renderWithQueries(<BrowsePage passageNotFound />);
		expect(
			await screen.findByText(
				"We couldn't find those verses. Choose a book below, or search for a verse.",
			),
		).toBeTruthy();
	});
});

const johnPage: BookPageData = {
	availableChapters: [1, 2, 3],
	book: { group: "Gospels", name: "John", slug: "john", testament: "new" },
	chapterCount: 21,
	hasAbout: true,
	lastRead: 3,
	summary: "The life of Jesus told through signs and conversations.",
};

describe("Choose a chapter", () => {
	it("shows the book, a way into About this book, and every chapter", async () => {
		server.getBookPage.mockResolvedValue(johnPage);
		renderWithQueries(<BookPage bookSlug="john" />);

		await screen.findByRole("heading", { level: 1, name: "John" });
		expect(screen.getByText("New Testament · Gospels")).toBeTruthy();
		expect(href(/About this book/)).toBe("/bible/john/about");
		expect(
			screen.getByText(
				"John has 21 chapters. You were last reading chapter 3. Chapters with a dashed edge can't be read yet.",
			),
		).toBeTruthy();
		const chapters = within(screen.getByRole("list")).getAllByRole("link");
		expect(chapters).toHaveLength(21);
		expect(href("John 3, last read")).toBe("/bible/john/3");
		expect(href("John 4, not available yet")).toBe("/bible/john/4");
		expect(href("Books")).toBe("/bible");
	});

	it("says so when none of a book can be read yet, and leaves out an empty About", async () => {
		server.getBookPage.mockResolvedValue({
			...johnPage,
			availableChapters: [],
			hasAbout: false,
			lastRead: null,
			summary: null,
		});
		renderWithQueries(<BookPage bookSlug="john" />);
		await screen.findByText(
			"John has 21 chapters. None of John can be read yet. We're adding the Bible one chapter at a time.",
		);
		expect(screen.queryByRole("link", { name: /About this book/ })).toBeNull();
	});

	it("explains a book that doesn't exist", async () => {
		server.getBookPage.mockResolvedValue(null);
		renderWithQueries(<BookPage bookSlug="hezekiah" />);
		await screen.findByText("We can't find that book");
	});
});

const aboutJohn: AboutBook = {
	book: { name: "John", slug: "john" },
	details: [
		{ label: "Written by", value: "John the apostle" },
		{ label: "When", value: "Around AD 85–95" },
	],
	introduction: {
		sections: [
			{
				key: "a",
				title: "Purpose",
				writing: {
					document: {
						content: [
							{
								content: [{ text: "John tells fewer stories.", type: "text" }],
								type: "paragraph",
							},
						],
						type: "doc",
					},
					firstCitation: 1,
				},
			},
		],
		sources: [],
		title: "Introduction to John",
	},
	keyVerse: {
		label: "John 20:31",
		place: { chapter: 20, verse: 31 },
		text: "But these are written, that ye might believe…",
		translationAbbreviation: "KJV",
	},
	outline: [
		{
			heading: "The Word becomes flesh",
			place: { chapter: 1, verse: 1 },
			range: "1:1–18",
		},
	],
	summary: "The story of Jesus, told so that readers might believe.",
	themes: ["Believing", "Eternal life"],
};

describe("About this book", () => {
	it("shows each part that has something in it", async () => {
		server.getAboutBook.mockResolvedValue(aboutJohn);
		renderWithQueries(<AboutBookPage bookSlug="john" />);

		await screen.findByRole("heading", { level: 1, name: "John" });
		const details = screen.getAllByRole("definition")[0]?.closest("dl");
		expect(details?.textContent).toContain("Written byJohn the apostle");
		expect(details?.textContent).toContain("WhenAround AD 85–95");
		expect(
			screen.getByText("But these are written, that ye might believe…"),
		).toBeTruthy();
		expect(href("John 20:31 · KJV")).toBe("/bible/john/20?verse=31");
		expect(screen.getByText("Eternal life")).toBeTruthy();
		expect(href(/The Word becomes flesh/)).toBe("/bible/john/1?verse=1");
		expect(screen.getByText("John tells fewer stories.")).toBeTruthy();
		expect(href("Start reading John")).toBe("/bible/john/1");
		expect(href("John")).toBe("/bible/john");
	});

	it("leaves out parts with nothing in them", async () => {
		server.getAboutBook.mockResolvedValue({
			...aboutJohn,
			details: [],
			introduction: null,
			keyVerse: null,
			themes: [],
		});
		renderWithQueries(<AboutBookPage bookSlug="john" />);
		await screen.findByRole("heading", {
			level: 2,
			name: "How the book is laid out",
		});
		for (const missing of ["Key verse", "Key themes", "Introduction"]) {
			expect(screen.queryByRole("heading", { name: missing })).toBeNull();
		}
		expect(screen.queryByRole("definition")).toBeNull();
	});

	it("says kindly when nothing has been written about the book yet", async () => {
		server.getAboutBook.mockResolvedValue({
			book: { name: "John", slug: "john" },
			details: [],
			introduction: null,
			keyVerse: null,
			outline: [],
			summary: null,
			themes: [],
		});
		renderWithQueries(<AboutBookPage bookSlug="john" />);
		await screen.findByText("We haven't written about John yet");
		expect(href("Start reading John")).toBe("/bible/john/1");
	});
});
