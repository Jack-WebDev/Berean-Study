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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({
	getReadingPreferences: vi.fn(),
	listCanonBooks: vi.fn(),
	listReaderTranslations: vi.fn(),
	saveReadingPreferences: vi.fn(),
}));
vi.mock("@/functions/reader", () => server);

import { Welcome } from "../src/components/bible/welcome";
import { readerKeys } from "../src/queries/keys";

const translation = (
	abbreviation: string,
	name: string,
	available: boolean,
) => ({
	abbreviation,
	available,
	copyrightNotice: null,
	id: abbreviation.length,
	name,
});

beforeEach(() => {
	server.listReaderTranslations.mockResolvedValue([
		translation("KJV", "King James Version", true),
		translation("NKJV", "New King James Version", false),
		translation("ESV", "English Standard Version", false),
	]);
	server.listCanonBooks.mockResolvedValue({
		books: [],
		tradition: { name: "Protestant", slug: "protestant" },
		traditions: [
			{ hasList: true, name: "Protestant", slug: "protestant" },
			{ hasList: true, name: "Catholic", slug: "catholic" },
			{
				hasList: false,
				name: "Ethiopian Orthodox Tewahedo",
				slug: "ethiopian-orthodox",
			},
		],
		usingFallbackList: false,
	});
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

/** The welcome reads its settings from the cache, the way the Bible page loads them. */
function renderWelcome() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	queryClient.setQueryData(readerKeys.preferences(), defaultReadingPreferences);
	function Harness() {
		const preferences =
			queryClient.getQueryData<ReadingPreferences>(readerKeys.preferences()) ??
			defaultReadingPreferences;
		return <Welcome preferences={preferences} />;
	}
	const view = render(
		<QueryClientProvider client={queryClient}>
			<Harness />
		</QueryClientProvider>,
	);
	return { queryClient, view };
}

const saved = (data: Partial<ReadingPreferences>) =>
	waitFor(() =>
		expect(server.saveReadingPreferences).toHaveBeenCalledWith({ data }),
	);

describe("first-time welcome", () => {
	it("starts with which Bible, and says why the others aren't ready", async () => {
		renderWelcome();
		const welcome = await screen.findByRole("dialog", {
			name: "Welcome to the Bible",
		});
		expect(within(welcome).getByText("Step 1 of 3")).toBeTruthy();
		expect(
			within(welcome).getByRole("heading", {
				level: 1,
				name: "Welcome to the Bible",
			}),
		).toBe(document.activeElement);
		await within(welcome).findByText(
			"Other translations (NKJV, ESV) are not available yet. We're waiting for permission from their publishers.",
		);
		expect(
			within(welcome)
				.getByRole("radio", { name: /^I'm not sure/ })
				.getAttribute("aria-checked"),
		).toBe("true");

		fireEvent.click(
			within(welcome).getByRole("radio", {
				name: /King James Version \(KJV\)/,
			}),
		);
		await saved({ translationAbbreviation: "KJV" });
	});

	it("changes the words' size as each size is tapped", async () => {
		renderWelcome();
		const welcome = await screen.findByRole("dialog");
		fireEvent.click(within(welcome).getByRole("button", { name: "Continue" }));

		expect(within(welcome).getByText("Step 2 of 3")).toBeTruthy();
		fireEvent.click(within(welcome).getByRole("radio", { name: "Largest" }));
		await saved({ textSize: "largest" });
		expect(within(welcome).getByRole("button", { name: "Back" })).toBeTruthy();
	});

	it("asks which list of books, with a line about each", async () => {
		renderWelcome();
		const welcome = await screen.findByRole("dialog");
		fireEvent.click(within(welcome).getByRole("button", { name: "Skip" }));
		fireEvent.click(within(welcome).getByRole("button", { name: "Skip" }));

		expect(within(welcome).getByText("Step 3 of 3")).toBeTruthy();
		await within(welcome).findByText("Includes Tobit, Judith and other books");
		expect(
			within(welcome).getByText(
				"The widest list, including Enoch. Not ready yet, so you'll see the Protestant list for now.",
			),
		).toBeTruthy();

		fireEvent.click(within(welcome).getByRole("radio", { name: /^Catholic/ }));
		await saved({ traditionSlug: "catholic" });
		fireEvent.click(
			within(welcome).getByRole("radio", { name: /^I'm not sure/ }),
		);
		await saved({ traditionSlug: "protestant" });

		fireEvent.click(
			within(welcome).getByRole("button", { name: "Start reading" }),
		);
		await saved({ welcomeCompleted: true });
	});

	it("goes back a step", async () => {
		renderWelcome();
		const welcome = await screen.findByRole("dialog");
		fireEvent.click(within(welcome).getByRole("button", { name: "Continue" }));
		fireEvent.click(within(welcome).getByRole("button", { name: "Back" }));
		expect(within(welcome).getByText("Step 1 of 3")).toBeTruthy();
	});

	it("can be skipped altogether, and then doesn't come back", async () => {
		renderWelcome();
		const welcome = await screen.findByRole("dialog");
		fireEvent.click(within(welcome).getByRole("button", { name: "Skip all" }));
		await saved({ welcomeCompleted: true });
		expect(server.saveReadingPreferences).toHaveBeenCalledTimes(1);
	});
});
