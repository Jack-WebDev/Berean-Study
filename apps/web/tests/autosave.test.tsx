import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutosave } from "../src/lib/use-autosave";

type Props = {
	canSave?: boolean;
	paused?: boolean;
	save: (values: string) => Promise<unknown>;
	values: string;
};

function renderAutosave(props: Props) {
	const client = new QueryClient();
	return renderHook(
		({ canSave, paused, save, values }: Props) =>
			useAutosave({
				canSave,
				delayMs: 1000,
				initialValues: "",
				paused,
				save,
				values,
			}),
		{
			initialProps: props,
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={client}>{children}</QueryClientProvider>
			),
		},
	);
}

/** A promise the test settles when it chooses. */
function gate() {
	let open: () => void = () => undefined;
	let fail: (error: Error) => void = () => undefined;
	const promise = new Promise<void>((resolve, reject) => {
		open = resolve;
		fail = reject;
	});
	return { fail, open, promise };
}

const wait = (ms: number) => act(async () => vi.advanceTimersByTime(ms));

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("autosave", () => {
	it("waits until typing stops, then saves the latest values once", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const { rerender, result } = renderAutosave({ save, values: "" });

		rerender({ save, values: "Th" });
		expect(result.current.state).toBe("pending");
		await wait(800);
		rerender({ save, values: "They" });
		await wait(800);
		expect(save).not.toHaveBeenCalled();

		await wait(200);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith("They");
		expect(result.current.state).toBe("saved");
		expect(result.current.isDirty).toBe(false);
	});

	it("runs saves one at a time, so a second save sees what the first created", async () => {
		const firstSave = gate();
		let createdId: number | null = null;
		const seen: Array<number | null> = [];
		const save = vi.fn(async () => {
			seen.push(createdId);
			if (createdId === null) {
				await firstSave.promise;
				createdId = 7;
			}
		});
		const { rerender, result } = renderAutosave({ save, values: "" });

		rerender({ save, values: "First" });
		let first: Promise<void> = Promise.resolve();
		act(() => {
			first = result.current.flush();
		});
		rerender({ save, values: "First, then more" });
		let second: Promise<void> = Promise.resolve();
		act(() => {
			second = result.current.flush();
		});
		await act(async () => undefined);
		expect(save).toHaveBeenCalledTimes(1);

		await act(async () => {
			firstSave.open();
			await first;
			await second;
		});
		expect(seen).toEqual([null, 7]);
		expect(save).toHaveBeenLastCalledWith("First, then more");
	});

	it("stays failed while typing goes on, and a retry saves the latest values", async () => {
		const save = vi
			.fn()
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValue(undefined);
		const { rerender, result } = renderAutosave({ save, values: "" });

		rerender({ save, values: "Body" });
		await wait(1000);
		expect(result.current.state).toBe("failed");
		expect(result.current.error?.message).toBe("offline");

		rerender({ save, values: "Body, more" });
		expect(result.current.state).toBe("failed");

		await act(async () => result.current.retry());
		expect(save).toHaveBeenLastCalledWith("Body, more");
		expect(result.current.state).toBe("saved");
		expect(result.current.error).toBeNull();
	});

	it("doesn't save what can't be saved yet, or while paused", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const { rerender, result } = renderAutosave({
			canSave: false,
			save,
			values: "",
		});

		rerender({ canSave: false, save, values: "No title yet" });
		await wait(2000);
		expect(save).not.toHaveBeenCalled();
		expect(result.current.state).toBe("pending");

		rerender({ canSave: true, paused: true, save, values: "No title yet" });
		await wait(2000);
		expect(save).not.toHaveBeenCalled();

		rerender({ canSave: true, paused: false, save, values: "No title yet" });
		await wait(1000);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it("skips a save when nothing has changed", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const { result } = renderAutosave({ save, values: "" });

		await act(async () => result.current.flush());
		await wait(2000);
		expect(save).not.toHaveBeenCalled();
		expect(result.current.state).toBe("idle");
	});

	it("keeps a save made elsewhere when an older autosave finishes late", async () => {
		const slowSave = gate();
		const save = vi.fn(() => slowSave.promise);
		const { rerender, result } = renderAutosave({ save, values: "" });

		rerender({ save, values: "Old" });
		await wait(1000);
		expect(result.current.state).toBe("saving");

		rerender({ save, values: "Saved by the button" });
		act(() => result.current.markSaved("Saved by the button"));
		await act(async () => slowSave.fail(new Error("too late")));

		expect(result.current.state).toBe("saved");
		expect(result.current.isDirty).toBe(false);
	});
});
