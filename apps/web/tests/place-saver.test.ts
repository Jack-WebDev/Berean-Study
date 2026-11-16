import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPlaceSaver } from "../src/components/reader/place-saver";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

function saverAt(verse: () => number | null) {
	const save = vi.fn();
	const saver = createPlaceSaver({ delayMs: 1500, measure: verse, save });
	return { save, saver };
}

describe("saving the reading place", () => {
	it("waits until scrolling has stopped, then saves the verse at the top", () => {
		let top = 3;
		const { save, saver } = saverAt(() => top);

		saver.saveSoon();
		vi.advanceTimersByTime(1000);
		top = 9;
		saver.saveSoon();
		vi.advanceTimersByTime(1000);
		expect(save).not.toHaveBeenCalled();

		vi.advanceTimersByTime(500);
		expect(save).toHaveBeenCalledExactlyOnceWith(9);
	});

	it("saves straight away when leaving, using the verse last seen", () => {
		let top: number | null = 12;
		const { save, saver } = saverAt(() => top);

		saver.noteVerse();
		saver.saveSoon();
		// Leaving the chapter takes its verses off the page.
		top = null;
		saver.saveNow();

		expect(save).toHaveBeenCalledExactlyOnceWith(12);
		vi.advanceTimersByTime(5000);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it("doesn't save the same verse twice in a row", () => {
		const { save, saver } = saverAt(() => 5);

		saver.saveSoon();
		vi.advanceTimersByTime(1500);
		saver.saveSoon();
		vi.advanceTimersByTime(1500);
		saver.saveNow();

		expect(save).toHaveBeenCalledExactlyOnceWith(5);
	});

	it("saves nothing before a verse has been seen", () => {
		const { save, saver } = saverAt(() => null);

		saver.saveSoon();
		vi.advanceTimersByTime(1500);
		saver.saveNow();

		expect(save).not.toHaveBeenCalled();
	});
});
