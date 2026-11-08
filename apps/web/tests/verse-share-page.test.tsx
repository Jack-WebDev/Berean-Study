import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const community = vi.hoisted(() => ({
	getMyPostingRestriction: vi.fn(),
	publishVersePost: vi.fn(),
}));
const reader = vi.hoisted(() => ({ getVerseWords: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/functions/community", () => community);
vi.mock("@/functions/reader", () => reader);
vi.mock("sonner", () => ({ toast }));
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params: _params,
		search: _search,
		to,
		...props
	}: {
		children?: ReactNode;
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

import { CommunityPostCard } from "../src/components/community/community-post-card";
import { VerseSharePage } from "../src/components/community/verse-share-page";

beforeEach(() => {
	reader.getVerseWords.mockResolvedValue({
		reference: "Romans 8:28 (KJV)",
		text: "And we know that all things work together for good.",
	});
	community.getMyPostingRestriction.mockResolvedValue(null);
	community.publishVersePost.mockResolvedValue({
		alreadyPublished: false,
		id: 5,
	});
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<VerseSharePage
				bookSlug="romans"
				chapter={8}
				translationAbbreviation="KJV"
				verses={[28]}
			/>
		</QueryClientProvider>,
	);
}

describe("sharing a verse with Community", () => {
	it("shows the published words, which can't be edited", async () => {
		renderPage();

		expect(
			await screen.findByText(
				"“And we know that all things work together for good.”",
			),
		).toBeTruthy();
		expect(screen.getByText("Romans 8:28 (KJV)")).toBeTruthy();
		expect(screen.getAllByRole("textbox")).toHaveLength(1);
		expect(screen.getByRole("link", { name: "Back to Romans 8" })).toBeTruthy();
	});

	it("publishes with an optional thought, then opens the Verses feed", async () => {
		renderPage();
		fireEvent.change(await screen.findByLabelText("Your thoughts (optional)"), {
			target: { value: "This got me through a hard week." },
		});
		fireEvent.click(screen.getByRole("button", { name: "Publish" }));

		await waitFor(() =>
			expect(community.publishVersePost).toHaveBeenCalledWith({
				data: {
					bookSlug: "romans",
					chapter: 8,
					thought: "This got me through a hard week.",
					translationAbbreviation: "KJV",
					verses: [28],
				},
			}),
		);
		await waitFor(() =>
			expect(navigate).toHaveBeenCalledWith({
				search: { view: "verse" },
				to: "/community",
			}),
		);
		expect(toast.success).toHaveBeenCalledWith("Published to Community.");
	});

	it("publishes without a thought too", async () => {
		renderPage();
		fireEvent.click(await screen.findByRole("button", { name: "Publish" }));
		await waitFor(() =>
			expect(community.publishVersePost).toHaveBeenCalledWith({
				data: expect.objectContaining({ thought: "" }),
			}),
		);
	});

	it("explains when the member's posting is restricted", async () => {
		community.getMyPostingRestriction.mockResolvedValue(
			new Date("2026-12-01T12:00:00Z"),
		);
		renderPage();

		expect(
			await screen.findByText(/A moderator has restricted your posting/),
		).toBeTruthy();
		await screen.findByRole("button", { name: "Publish" });
		expect(
			(screen.getByRole("button", { name: "Publish" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});
});

describe("a shared verse in the feed", () => {
	it("shows the verse words in place of a picture, and the thought only if there is one", () => {
		render(
			<CommunityPostCard
				post={{
					author: { id: "a", name: "Ruth" },
					excerpt: "",
					href: "/community",
					id: "5",
					isBookmarked: false,
					isOwn: true,
					publishedAt: new Date("2026-11-08"),
					title: "Romans 8:28 (KJV)",
					type: "verse",
					verseText: "And we know that all things work together for good.",
				}}
			/>,
		);

		expect(
			screen.getByText("“And we know that all things work together for good.”"),
		).toBeTruthy();
		expect(screen.getByText("Romans 8:28 (KJV)")).toBeTruthy();
		expect(document.querySelectorAll("p.line-clamp-3")).toHaveLength(0);
	});
});
