import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChapterDrafts } from "../src/components/staff/scripture/entry/use-chapter-drafts";
import { saveVerseDrafts } from "../src/functions/verse-entry";

vi.mock("../src/functions/verse-entry", () => ({
	saveVerseDrafts: vi.fn(),
}));
vi.mock("../src/functions/verse-proofreading", () => ({}));

const save = vi.mocked(saveVerseDrafts);
const address = { abbreviation: "KJV", chapter: 8, slug: "romans" };
const rows = [
	{ number: 1, status: "draft" as const, text: "First." },
	{ number: 2, status: "empty" as const, text: "" },
];

function setup() {
	const queryClient = new QueryClient();
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(
		({ current }: { current: typeof rows }) =>
			useChapterDrafts(address, current),
		{ initialProps: { current: rows }, wrapper },
	);
}

function lastSavedVerses() {
	return save.mock.lastCall?.[0]?.data.verses;
}

describe("useChapterDrafts", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		save.mockReset();
		save.mockResolvedValue(undefined as never);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("saves shortly after typing stops, not on every key", async () => {
		const { result } = setup();

		act(() => result.current.setVerseText(2, "S"));
		await act(() => vi.advanceTimersByTimeAsync(600));
		act(() => result.current.setVerseText(2, "Second."));
		await act(() => vi.advanceTimersByTimeAsync(600));
		expect(save).not.toHaveBeenCalled();

		await act(() => vi.advanceTimersByTimeAsync(700));
		expect(save).toHaveBeenCalledTimes(1);
		expect(lastSavedVerses()).toEqual([
			{ baseText: "", number: 2, text: "Second." },
		]);
		expect(result.current.state).toBe("saved");
	});

	it("doesn't save trailing spaces as a change, or lose them while typing", async () => {
		const { result } = setup();

		act(() => result.current.setVerseText(1, "First. "));
		await act(() => vi.advanceTimersByTimeAsync(2000));

		expect(save).not.toHaveBeenCalled();
		expect(result.current.edits[1]).toBe("First. ");
	});

	it("starts the next save from what it just saved", async () => {
		const { result } = setup();

		act(() => result.current.setVerseText(1, "Changed."));
		await act(() => vi.advanceTimersByTimeAsync(1300));
		act(() => result.current.setVerseText(1, "Changed again."));
		await act(() => vi.advanceTimersByTimeAsync(1300));

		expect(lastSavedVerses()).toEqual([
			{ baseText: "Changed.", number: 1, text: "Changed again." },
		]);
	});

	it("doesn't adopt someone else's wording under a verse being edited", async () => {
		const { result, rerender } = setup();

		act(() => result.current.setVerseText(1, "Mine."));
		rerender({
			current: [
				{ number: 1, status: "draft", text: "Theirs." },
				rows[1] as (typeof rows)[number],
			],
		});
		await act(() => vi.advanceTimersByTimeAsync(1300));

		expect(lastSavedVerses()?.[0]?.baseText).toBe("First.");
	});

	it("shows why a save was refused, and holds on to the typing", async () => {
		save.mockRejectedValue(new Error("Someone else has changed verse 1."));
		const { result } = setup();

		act(() => result.current.setVerseText(1, "Mine."));
		await act(() => vi.advanceTimersByTimeAsync(1300));

		expect(result.current.state).toBe("failed");
		expect(result.current.error).toBe("Someone else has changed verse 1.");
		expect(result.current.edits[1]).toBe("Mine.");
	});

	it("tells the caller when a save failed, so nothing is sent on", async () => {
		save.mockRejectedValue(new Error("No."));
		const { result } = setup();

		act(() => result.current.setVerseText(1, "Mine."));
		let saved: boolean | undefined;
		await act(async () => {
			saved = await result.current.flush();
		});

		expect(saved).toBe(false);
	});

	it("saves on the way out when moving to another chapter", async () => {
		const { result, unmount } = setup();

		act(() => result.current.setVerseText(1, "Typed just before leaving."));
		await act(async () => {
			unmount();
			await vi.advanceTimersByTimeAsync(0);
		});

		expect(lastSavedVerses()).toEqual([
			{ baseText: "First.", number: 1, text: "Typed just before leaving." },
		]);
	});

	it("resends a sent-back verse unchanged when its wording is kept", async () => {
		const sentBack = [
			{ number: 1, status: "needs_fix" as const, text: "As is." },
		];
		const queryClient = new QueryClient();
		const { result } = renderHook(() => useChapterDrafts(address, sentBack), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			),
		});

		await act(async () => {
			result.current.keepWording(1);
			await vi.advanceTimersByTimeAsync(0);
		});

		expect(lastSavedVerses()).toEqual([
			{ baseText: "As is.", number: 1, text: "As is." },
		]);
	});

	it("sends pasted verses in one save with anything still being typed", async () => {
		const { result } = setup();

		act(() => result.current.setVerseText(1, "Typed."));
		await act(async () => {
			await result.current.savePasted([{ number: 2, text: "Pasted." }]);
		});

		expect(save).toHaveBeenCalledTimes(1);
		expect(save.mock.lastCall?.[0]?.data).toMatchObject({
			addMissingVerses: true,
			verses: [
				{ baseText: "First.", number: 1, text: "Typed." },
				{ baseText: "", number: 2, text: "Pasted." },
			],
		});
	});
});
