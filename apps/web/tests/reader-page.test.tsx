import type { ReaderChapter, ReaderTranslation } from "@berean-study/db/reader";
import {
	defaultReadingPreferences,
	type ReadingPreferences,
} from "@berean-study/db/reader-catalogue";
import type { VerseStudy } from "@berean-study/db/reader-study";
import type {
	RichTextDocument,
	RichTextNode,
} from "@berean-study/rich-text-editor/document";
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
	addVersesToCollection: vi.fn(),
	getChapterMarks: vi.fn(),
	getReaderChapter: vi.fn(),
	getReadingPlace: vi.fn(),
	getReadingPreferences: vi.fn(),
	getVerseStudy: vi.fn(),
	listReaderTranslations: vi.fn(),
	listRecentChapters: vi.fn(),
	passagesForVerses: vi.fn(),
	recordChapterVisit: vi.fn(),
	removeVersesFromCollection: vi.fn(),
	reportStudyProblem: vi.fn(),
	saveReadingPlace: vi.fn(),
	saveReadingPreferences: vi.fn(),
	saveVerses: vi.fn(),
	setVersesHighlighted: vi.fn(),
	undoHighlightChange: vi.fn(),
	unsaveVerses: vi.fn(),
}));
const navigate = vi.hoisted(() => vi.fn());
const notesServer = vi.hoisted(() => ({
	deleteNote: vi.fn(),
	saveNote: vi.fn(),
}));
const collectionsServer = vi.hoisted(() => ({
	listCollectionsForNotes: vi.fn(),
}));

vi.mock("@/functions/reader", () => server);
vi.mock("@/functions/notes", () => notesServer);
vi.mock("@/functions/collections", () => collectionsServer);

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
	useNavigate: () => navigate,
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

describe("tapping verses", () => {
	const clipboard = { writeText: vi.fn() };

	beforeEach(() => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: clipboard,
		});
		clipboard.writeText.mockResolvedValue(undefined);
		server.setVersesHighlighted.mockResolvedValue({
			label: "Romans 8:28",
			undo: { remove: [41] },
		});
		server.undoHighlightChange.mockResolvedValue(undefined);
		server.saveVerses.mockResolvedValue({
			addedPassageIds: [7],
			label: "Romans 8:28",
		});
		server.unsaveVerses.mockResolvedValue(undefined);
		server.passagesForVerses.mockResolvedValue({
			label: "Romans 8:28",
			passages: [{ label: "Romans 8:28", passageId: 7 }],
		});
		server.addVersesToCollection.mockResolvedValue({
			addedPassageIds: [7],
			collectionName: "Favourites",
			label: "Romans 8:28",
		});
		server.removeVersesFromCollection.mockResolvedValue(undefined);
		collectionsServer.listCollectionsForNotes.mockResolvedValue([
			{ id: 3, name: "Favourites" },
			{ id: 4, name: "Hope" },
		]);
		notesServer.saveNote.mockResolvedValue({ id: 99 });
	});

	async function choose(...verses: RegExp[]) {
		for (const verse of verses) {
			fireEvent.click(await screen.findByRole("button", { name: verse }));
		}
		return screen.findByRole("dialog");
	}

	it("opens the verse sheet, adds more verses as they're tapped, and closes when none are left", async () => {
		renderReader(romans(8));

		let sheet = await choose(/^28 And we know/);
		expect(within(sheet).getByText("Romans 8:28")).toBeTruthy();
		expect(
			within(sheet).getByText("Tap other verses to add them."),
		).toBeTruthy();

		sheet = await choose(/^30 Moreover/, /^29 For whom/);
		expect(within(sheet).getByText("Romans 8:28–30")).toBeTruthy();

		fireEvent.click(verseButton(/^28 And we know/));
		fireEvent.click(verseButton(/^29 For whom/));
		fireEvent.click(verseButton(/^30 Moreover/));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});

	it("clears the chosen verses with Done", async () => {
		renderReader(romans(8));
		const sheet = await choose(/^28 And we know/);

		fireEvent.click(within(sheet).getByRole("button", { name: "Done" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(verseButton(/^28 And we know/).getAttribute("aria-pressed")).toBe(
			"false",
		);
	});

	it("highlights at once, and Undo takes it away", async () => {
		renderReader(romans(8));
		const sheet = await choose(/^28 And we know/);
		fireEvent.click(within(sheet).getByRole("button", { name: "Highlight" }));

		await waitFor(() =>
			expect(server.setVersesHighlighted).toHaveBeenCalledWith({
				data: {
					bookSlug: "romans",
					chapter: 8,
					highlighted: true,
					translationAbbreviation: "KJV",
					verses: [28],
				},
			}),
		);
		await screen.findByText("Highlighted Romans 8:28");
		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		await waitFor(() =>
			expect(server.undoHighlightChange).toHaveBeenCalledWith({
				data: { remove: [41] },
			}),
		);
	});

	it("offers to remove a highlight when every chosen verse has one", async () => {
		server.getChapterMarks.mockResolvedValue({
			highlighted: [28],
			noted: [],
			study: [],
		});
		renderReader(romans(8));
		await waitFor(() =>
			expect(verseButton(/^28 And we know/).textContent).toContain(
				"highlighted",
			),
		);
		const sheet = await choose(/^28 And we know/);

		expect(
			within(sheet).getByRole("button", { name: "Remove highlight" }),
		).toBeTruthy();
	});

	it("saves, and says so when the verse was already saved", async () => {
		renderReader(romans(8));
		let sheet = await choose(/^28 And we know/);
		fireEvent.click(within(sheet).getByRole("button", { name: "Save" }));
		await screen.findByText("Saved Romans 8:28 to your Saved verses");
		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		await waitFor(() =>
			expect(server.unsaveVerses).toHaveBeenCalledWith({
				data: { passageIds: [7] },
			}),
		);

		server.saveVerses.mockResolvedValue({
			addedPassageIds: [],
			label: "Romans 8:28",
		});
		sheet = await choose(/^28 And we know/);
		fireEvent.click(within(sheet).getByRole("button", { name: "Save" }));
		await screen.findByText("Romans 8:28 is already in your Saved verses");
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
	});

	it("copies the words with where they're from", async () => {
		renderReader(romans(8));
		const sheet = await choose(/^28 And we know/, /^29 For whom/);
		fireEvent.click(within(sheet).getByRole("button", { name: "Copy" }));

		await screen.findByText("Copied Romans 8:28–29 (KJV)");
		expect(clipboard.writeText).toHaveBeenCalledWith(
			"“28 And we know that all things work together for good. 29 For whom he did foreknow, he also did predestinate.” Romans 8:28–29 (KJV)",
		);
	});

	it("lets the reader choose a collection, and Undo takes the verse out again", async () => {
		renderReader(romans(8));
		const sheet = await choose(/^28 And we know/);
		fireEvent.click(
			within(sheet).getByRole("button", { name: "Add to collection" }),
		);
		const picker = await screen.findByRole("dialog", {
			name: "Add to collection",
		});

		fireEvent.click(
			await within(picker).findByRole("button", { name: "Favourites" }),
		);
		await screen.findByText("Added Romans 8:28 to “Favourites”");
		expect(server.addVersesToCollection).toHaveBeenCalledWith({
			data: expect.objectContaining({ collectionId: 3, verses: [28] }),
		});
		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		await waitFor(() =>
			expect(server.removeVersesFromCollection).toHaveBeenCalledWith({
				data: { collectionId: 3, passageIds: [7] },
			}),
		);
	});

	it("goes back to the verse actions when the collection picker closes without a choice", async () => {
		renderReader(romans(8));
		const sheet = await choose(/^28 And we know/);
		fireEvent.click(
			within(sheet).getByRole("button", { name: "Add to collection" }),
		);
		const picker = await screen.findByRole("dialog", {
			name: "Add to collection",
		});

		fireEvent.click(within(picker).getByRole("button", { name: "Close" }));
		expect(
			await screen.findByRole("dialog", { name: "Romans 8:28" }),
		).toBeTruthy();
	});

	it("saves a note on the verses, titled with their reference", async () => {
		renderReader(romans(8));
		const sheet = await choose(/^28 And we know/);
		fireEvent.click(within(sheet).getByRole("button", { name: "Add a note" }));
		const note = await screen.findByRole("dialog", { name: "Add a note" });

		fireEvent.change(within(note).getByLabelText("Your note on Romans 8:28"), {
			target: { value: "God is at work.\nEven now." },
		});
		fireEvent.click(within(note).getByRole("button", { name: "Done" }));

		await screen.findByText("Note saved on Romans 8:28");
		expect(notesServer.saveNote).toHaveBeenCalledTimes(1);
		expect(notesServer.saveNote).toHaveBeenCalledWith({
			data: {
				content: {
					content: [
						{
							content: [{ text: "God is at work.", type: "text" }],
							type: "paragraph",
						},
						{
							content: [{ text: "Even now.", type: "text" }],
							type: "paragraph",
						},
					],
					type: "doc",
				},
				id: undefined,
				passageIds: [7],
				status: "saved",
				tags: [],
				title: "Note on Romans 8:28",
			},
		});
	});

	it("clears the last message when a full-height sheet opens over it", async () => {
		renderReader(romans(8));
		server.saveVerses.mockResolvedValue({
			addedPassageIds: [8],
			label: "Romans 8:30",
		});
		let sheet = await choose(/^30 Moreover/);
		fireEvent.click(within(sheet).getByRole("button", { name: "Save" }));
		await screen.findByText("Saved Romans 8:30 to your Saved verses");

		sheet = await choose(/^28 And we know/);
		fireEvent.click(within(sheet).getByRole("button", { name: "Add a note" }));
		await screen.findByRole("dialog", { name: "Add a note" });
		await waitFor(() =>
			expect(
				screen.queryByText("Saved Romans 8:30 to your Saved verses"),
			).toBeNull(),
		);
	});

	it("opens the Community share page with the chosen verses", async () => {
		renderReader(romans(8));
		const sheet = await choose(/^29 For whom/, /^28 And we know/);
		fireEvent.click(within(sheet).getByRole("button", { name: "Share" }));

		expect(navigate).toHaveBeenCalledWith({
			search: {
				book: "romans",
				chapter: 8,
				translation: "KJV",
				type: "verse",
				verses: "28,29",
			},
			to: "/community/share",
		});
	});

	it("keeps nothing when the note is left empty", async () => {
		renderReader(romans(8));
		const sheet = await choose(/^28 And we know/);
		fireEvent.click(within(sheet).getByRole("button", { name: "Add a note" }));
		const note = await screen.findByRole("dialog", { name: "Add a note" });
		fireEvent.click(within(note).getByRole("button", { name: "Done" }));

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(notesServer.saveNote).not.toHaveBeenCalled();
		expect(screen.queryByText(/Note saved/)).toBeNull();
	});
});

const paragraph = (...content: RichTextNode[]): RichTextDocument => ({
	content: [{ content, type: "paragraph" }],
	type: "doc",
});

const romans828Study: VerseStudy = {
	groups: [
		{
			hint: "What this verse means",
			items: [
				{
					key: "1",
					kind: "explanation",
					reportLabel: "Explanation: God at work in every circumstance",
					revisionId: 501,
					sections: [
						{
							aboutChosenVerses: true,
							key: "a",
							title: "Note",
							writing: {
								document: paragraph(
									{ text: "God is at work in all of it.", type: "text" },
									{
										attrs: {
											excerptId: 7,
											label: "Moo",
											locator: "p. 529",
											strength: "direct",
										},
										type: "citation",
									},
								),
								firstCitation: 1,
							},
						},
						{
							aboutChosenVerses: false,
							key: "b",
							title: "Nothing can separate us",
							writing: {
								document: paragraph({
									text: "If God is for us, who can be against us?",
									type: "text",
								}),
								firstCitation: 2,
							},
						},
					],
					sources: [
						{
							byline: "Douglas J. Moo · 1996",
							detail: "p. 529 · Strongly supports this statement",
							isSummary: false,
							number: 1,
							quote: "God works in all things for good.",
							title: "The Epistle to the Romans",
						},
					],
					title: "God at work in every circumstance",
				},
			],
			key: "explanation",
			name: "Explanation",
		},
		{
			hint: "The Greek or Hebrew words behind the English",
			items: [
				{
					gloss: "work together",
					key: "2",
					kind: "word_meaning",
					language: "greek",
					lemma: "συνεργέω",
					note: {
						document: paragraph({ text: "Side by side.", type: "text" }),
						firstCitation: 1,
					},
					parsing: "verb, present tense",
					reportLabel: "Word meaning: συνεργεῖ",
					revisionId: 502,
					sources: [],
					word: "συνεργεῖ",
				},
			],
			key: "word_meanings",
			name: "Word meanings",
		},
		{
			hint: "Where Christians read this differently",
			items: [
				{
					key: "3",
					kind: "different_views",
					question: "Who works all things together?",
					reportLabel: "Different views: Who works all things together?",
					revisionId: 503,
					sources: [],
					takesNoSide: true,
					views: ["All things work", "God works"].map((name, index) => ({
						argument: {
							document: paragraph({ text: `${name} argument`, type: "text" }),
							firstCitation: 1,
						},
						heldBy: [`Scholars ${index + 1}`],
						key: String(index),
						name,
						preferred: false,
					})),
					whyItMatters: "It shapes how we read suffering.",
				},
			],
			key: "different_views",
			name: "Different views",
		},
		{
			hint: "Other verses on the same thought",
			items: [
				{
					key: "4",
					kind: "related_verse",
					kindLabel: "An example from a story",
					note: "Joseph saw God turn evil to good.",
					passage: {
						bookSlug: "genesis",
						chapter: 50,
						isChosen: false,
						label: "Genesis 50:20",
						text: "But God meant it unto good.",
						verse: 20,
					},
					reportLabel: "Related verse: Genesis 50:20",
					revisionId: 504,
					sources: [],
				},
			],
			key: "related_verses",
			name: "Related verses",
		},
	],
	reference: "Romans 8:28",
};

describe("study panel", () => {
	beforeEach(() => {
		server.getChapterMarks.mockResolvedValue({
			highlighted: [],
			noted: [],
			study: [
				{
					groups: [
						"explanation",
						"word_meanings",
						"different_views",
						"related_verses",
					],
					verse: 28,
				},
			],
		});
		server.getVerseStudy.mockResolvedValue(romans828Study);
		server.reportStudyProblem.mockResolvedValue({ status: "sent" });
	});

	async function openStudy(verse = /^28 And we know/) {
		fireEvent.click(await screen.findByRole("button", { name: verse }));
		const sheet = await screen.findByRole("dialog");
		fireEvent.click(
			within(sheet).getByRole("button", { name: /^Study this verse/ }),
		);
		return screen.findByRole("dialog", { name: "Study Romans 8:28" });
	}

	it("says how many kinds of notes a verse has before opening them", async () => {
		renderReader(romans(8));
		fireEvent.click(
			await screen.findByRole("button", { name: /^28 And we know/ }),
		);
		const sheet = await screen.findByRole("dialog");
		await within(sheet).findByText("4 kinds of notes for this verse");
	});

	it("fills the screen with the verse, the trust line and only groups with notes, the first open", async () => {
		renderReader(romans(8));
		const panel = await openStudy();

		expect(within(panel).getByText("Studying")).toBeTruthy();
		expect(
			within(panel).getByText(
				"And we know that all things work together for good.",
			),
		).toBeTruthy();
		await within(panel).findByText(
			"Checked by Berean Study editors. Sources are listed with each note.",
		);
		expect(
			[...panel.querySelectorAll("h3 > button")].map(
				(button) => button.querySelector("span span")?.textContent,
			),
		).toEqual([
			"Explanation",
			"Word meanings",
			"Different views",
			"Related verses",
		]);
		expect(
			within(panel)
				.getByRole("button", { name: "Explanation" })
				.getAttribute("aria-expanded"),
		).toBe("true");
		expect(
			within(panel)
				.getByRole("button", { name: "Word meanings" })
				.getAttribute("aria-expanded"),
		).toBe("false");
		expect(within(panel).queryByText("About the text")).toBeNull();
		expect(server.getVerseStudy).toHaveBeenCalledWith({
			data: {
				bookSlug: "romans",
				chapter: 8,
				translationAbbreviation: "KJV",
				verses: [28],
			},
		});
	});

	it("shows the rest of a passage's explanation only when asked", async () => {
		renderReader(romans(8));
		const panel = await openStudy();
		await within(panel).findByText("God is at work in all of it.");
		expect(
			within(panel).queryByText("If God is for us, who can be against us?"),
		).toBeNull();

		fireEvent.click(
			within(panel).getByRole("button", { name: "Read the full explanation" }),
		);
		expect(
			within(panel).getByText("If God is for us, who can be against us?"),
		).toBeTruthy();
		expect(within(panel).getByText("Nothing can separate us")).toBeTruthy();
	});

	it("opens a source from its number in the text or its chip", async () => {
		renderReader(romans(8));
		const panel = await openStudy();
		// The number in the text comes first, then the chip below.
		const [number] = await within(panel).findAllByRole("button", {
			name: "Source 1",
		});
		if (!number) throw new Error("No source number");
		expect(number.textContent).toBe("1");
		fireEvent.click(number);
		const card = within(panel).getByRole("region", { name: "Source 1" });
		expect(within(card).getByText("The Epistle to the Romans")).toBeTruthy();
		expect(
			within(card).getByText("p. 529 · Strongly supports this statement"),
		).toBeTruthy();
		expect(
			within(card).getByText("“God works in all things for good.”"),
		).toBeTruthy();
		for (const button of within(panel).getAllByRole("button", {
			name: "Source 1",
		})) {
			expect(button.getAttribute("aria-expanded")).toBe("true");
		}
	});

	it("marks Greek words so screen readers say them properly", async () => {
		renderReader(romans(8));
		const panel = await openStudy();
		fireEvent.click(
			await within(panel).findByRole("button", { name: "Word meanings" }),
		);
		expect(within(panel).getByText("συνεργεῖ").getAttribute("lang")).toBe(
			"grc",
		);
		expect(within(panel).getByText("work together")).toBeTruthy();
	});

	it("gives every view the same card, without taking a side", async () => {
		renderReader(romans(8));
		const panel = await openStudy();
		fireEvent.click(
			await within(panel).findByRole("button", { name: "Different views" }),
		);
		const views = within(panel).getAllByRole("listitem");
		expect(views.map((view) => view.className)).toEqual([
			views[0]?.className,
			views[0]?.className,
		]);
		expect(within(panel).getByText("View 1")).toBeTruthy();
		expect(within(panel).getByText("View 2")).toBeTruthy();
		expect(
			within(panel).getByText(
				"Berean Study presents both views without taking a side.",
			),
		).toBeTruthy();
	});

	it("links each related verse to the reading page", async () => {
		renderReader(romans(8));
		const panel = await openStudy();
		fireEvent.click(
			await within(panel).findByRole("button", { name: "Related verses" }),
		);
		expect(
			within(panel)
				.getByRole("link", { name: "Read Genesis 50:20" })
				.getAttribute("href"),
		).toBe("/bible/genesis/50");
		expect(within(panel).getByText("An example from a story")).toBeTruthy();
	});

	it("says kindly when a verse has no notes, without asking the server", async () => {
		renderReader(romans(8));
		fireEvent.click(
			await screen.findByRole("button", { name: /^29 For whom/ }),
		);
		const sheet = await screen.findByRole("dialog");
		await within(sheet).findByText("No notes for this verse yet");
		fireEvent.click(
			within(sheet).getByRole("button", { name: /^Study this verse/ }),
		);
		const panel = await screen.findByRole("dialog", {
			name: "Study Romans 8:29",
		});
		expect(
			within(panel).getByText("No study notes for this verse yet"),
		).toBeTruthy();
		expect(
			within(panel)
				.getByRole("link", { name: "Explore Study Tools" })
				.getAttribute("href"),
		).toBe("/study-tools");
		expect(server.getVerseStudy).not.toHaveBeenCalled();
	});

	it("offers Try again when the notes can't be loaded", async () => {
		server.getVerseStudy.mockRejectedValueOnce(new Error("offline"));
		renderReader(romans(8));
		const panel = await openStudy();
		await within(panel).findByText("We couldn't load the notes");
		fireEvent.click(within(panel).getByRole("button", { name: "Try again" }));
		await within(panel).findByText("God at work in every circumstance");
	});

	it("goes back to reading with nothing chosen", async () => {
		renderReader(romans(8));
		const panel = await openStudy();
		fireEvent.click(
			within(panel).getByRole("button", { name: "Back to reading" }),
		);
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(verseButton(/^28 And we know/).getAttribute("aria-pressed")).toBe(
			"false",
		);
	});

	it("reports a problem with the exact note the reader saw", async () => {
		renderReader(romans(8));
		const panel = await openStudy();
		fireEvent.click(
			await within(panel).findByRole("button", {
				name: "Report a problem with this note",
			}),
		);
		const form = await screen.findByRole("dialog", {
			name: "Report a problem",
		});
		expect(
			within(form).getByText(
				"About: Explanation: God at work in every circumstance",
			),
		).toBeTruthy();

		fireEvent.click(within(form).getByRole("button", { name: "Send report" }));
		expect(within(form).getByRole("alert").textContent).toBe(
			"Choose what kind of problem it is.",
		);

		fireEvent.click(
			within(form).getByRole("radio", { name: "A source is wrong or missing" }),
		);
		fireEvent.change(within(form).getByLabelText("What's wrong?"), {
			target: { value: "Page 529 says something else." },
		});
		fireEvent.click(within(form).getByRole("button", { name: "Send report" }));

		await waitFor(() =>
			expect(server.reportStudyProblem).toHaveBeenCalledWith({
				data: {
					description: "Page 529 says something else.",
					issueType: "citation_problem",
					revisionId: 501,
				},
			}),
		);
		await screen.findByText("Thank you. Your report has gone to our editors.", {
			selector: "p:not(.sr-only)",
		});
	});

	it("shows why a report was refused", async () => {
		server.reportStudyProblem.mockResolvedValue({
			message: "You've sent a lot of reports today. Please try again tomorrow.",
			status: "refused",
		});
		renderReader(romans(8));
		const panel = await openStudy();
		fireEvent.click(
			await within(panel).findByRole("button", {
				name: "Report a problem with this note",
			}),
		);
		const form = await screen.findByRole("dialog", {
			name: "Report a problem",
		});
		fireEvent.click(
			within(form).getByRole("radio", { name: "Something else" }),
		);
		fireEvent.change(within(form).getByLabelText("What's wrong?"), {
			target: { value: "Odd." },
		});
		fireEvent.click(within(form).getByRole("button", { name: "Send report" }));
		await within(form).findByText(
			"You've sent a lot of reports today. Please try again tomorrow.",
		);
	});

	describe("on a computer", () => {
		beforeEach(() => {
			window.matchMedia = ((query: string) => ({
				addEventListener: () => {},
				matches: query === "(min-width: 1024px)",
				removeEventListener: () => {},
			})) as unknown as typeof window.matchMedia;
		});
		afterEach(() => {
			// @ts-expect-error jsdom has no matchMedia of its own.
			delete window.matchMedia;
		});

		it("shows the actions and notes beside the text instead of a sheet", async () => {
			renderReader(romans(8));
			fireEvent.click(
				await screen.findByRole("button", { name: /^28 And we know/ }),
			);
			const panel = await screen.findByRole("complementary", {
				name: "Study Romans 8:28",
			});
			expect(screen.queryByRole("dialog")).toBeNull();
			expect(
				within(panel).getByRole("button", { name: "Highlight" }),
			).toBeTruthy();
			await within(panel).findByText("God at work in every circumstance");

			// More verses can still be tapped while it's open.
			fireEvent.click(verseButton(/^29 For whom/));
			await screen.findByRole("complementary", {
				name: "Study Romans 8:28–29",
			});

			fireEvent.click(
				within(screen.getByRole("complementary")).getByRole("button", {
					name: "Close",
				}),
			);
			expect(screen.queryByRole("complementary")).toBeNull();
		});

		it("closes with Esc", async () => {
			renderReader(romans(8));
			fireEvent.click(
				await screen.findByRole("button", { name: /^28 And we know/ }),
			);
			await screen.findByRole("complementary");
			fireEvent.keyDown(window, { key: "Escape" });
			await waitFor(() =>
				expect(screen.queryByRole("complementary")).toBeNull(),
			);
		});
	});
});
