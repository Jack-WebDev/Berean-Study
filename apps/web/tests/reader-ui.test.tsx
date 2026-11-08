import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BackLink } from "../src/components/reader-ui/back-link";
import { BottomSheet } from "../src/components/reader-ui/bottom-sheet";
import { ReaderButton } from "../src/components/reader-ui/button";
import {
	ChoiceGroup,
	ChoiceTile,
} from "../src/components/reader-ui/choice-group";
import { ReaderSkeleton } from "../src/components/reader-ui/reader-skeleton";
import {
	ReaderToastProvider,
	ReaderToastRegion,
	readerToastDuration,
	useReaderToast,
} from "../src/components/reader-ui/reader-toast";
import {
	ErrorCard,
	NotAvailable,
} from "../src/components/reader-ui/state-card";
import { StudyGroup } from "../src/components/reader-ui/study-group";
import { SwitchRow } from "../src/components/reader-ui/switch-row";
import { ToolbarTile } from "../src/components/reader-ui/toolbar-tile";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("buttons and links", () => {
	it("is a plain button by default, or the link it's given", () => {
		render(
			<>
				<ReaderButton variant="primary">Next: Romans 9</ReaderButton>
				<ReaderButton render={<a href="/bible/romans/9">Romans 9</a>} />
			</>,
		);

		expect(
			screen
				.getByRole("button", { name: "Next: Romans 9" })
				.getAttribute("type"),
		).toBe("button");
		expect(
			screen.getByRole("link", { name: "Romans 9" }).getAttribute("href"),
		).toBe("/bible/romans/9");
	});

	it("names where the back link goes", () => {
		render(<BackLink href="/bible">Books</BackLink>);
		expect(
			screen.getByRole("link", { name: "Books" }).getAttribute("href"),
		).toBe("/bible");
	});

	it("reads a toolbar tile by its word, not its glyph", () => {
		render(<ToolbarTile glyph="Aa" label="Text size" />);
		expect(screen.getByRole("button", { name: "Text size" })).toBeTruthy();
	});
});

function SheetHarness({ kind }: { kind: "tall" | "light" }) {
	const [open, setOpen] = useState(false);
	const [taps, setTaps] = useState(0);
	return (
		<>
			<button onClick={() => setOpen(true)} type="button">
				Open sheet
			</button>
			<button onClick={() => setTaps((count) => count + 1)} type="button">
				Verse 28 (tapped {taps})
			</button>
			<BottomSheet
				closeLabel={kind === "light" ? "Done" : "Close"}
				kind={kind}
				onOpenChange={setOpen}
				open={open}
				title="Text size"
			>
				<button type="button">Larger</button>
			</BottomSheet>
		</>
	);
}

describe("bottom sheets", () => {
	it("opens as a named dialog, moves focus in, and gives it back on Esc", async () => {
		render(<SheetHarness kind="tall" />);
		const opener = screen.getByRole("button", { name: "Open sheet" });
		opener.focus();
		fireEvent.click(opener);

		const sheet = await screen.findByRole("dialog", { name: "Text size" });
		await waitFor(() =>
			expect(sheet.contains(document.activeElement)).toBe(true),
		);
		expect(screen.getByTestId("sheet-scrim")).toBeTruthy();

		fireEvent.keyDown(document.activeElement ?? sheet, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(opener));
	});

	it("closes with its labelled close button", async () => {
		render(<SheetHarness kind="tall" />);
		fireEvent.click(screen.getByRole("button", { name: "Open sheet" }));
		fireEvent.click(await screen.findByRole("button", { name: "Close" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});

	it("leaves the page usable behind a light sheet, without closing it", async () => {
		render(<SheetHarness kind="light" />);
		fireEvent.click(screen.getByRole("button", { name: "Open sheet" }));
		await screen.findByRole("dialog", { name: "Text size" });
		expect(screen.queryByTestId("sheet-scrim")).toBeNull();

		const verse = screen.getByRole("button", { name: /Verse 28/ });
		fireEvent.pointerDown(verse);
		fireEvent.mouseDown(verse);
		fireEvent.click(verse);

		expect(
			screen.getByRole("button", { name: "Verse 28 (tapped 1)" }),
		).toBeTruthy();
		expect(screen.getByRole("dialog", { name: "Text size" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
	});
});

function ToastHarness({ onUndo }: { onUndo?: () => void }) {
	const { show } = useReaderToast();
	return (
		<>
			<button
				onClick={() => show("Highlighted Romans 8:28", { undo: onUndo })}
				type="button"
			>
				Highlight
			</button>
			<button onClick={() => show("Copied Romans 8:28 (KJV)")} type="button">
				Copy
			</button>
			<ReaderToastRegion />
		</>
	);
}

function renderToast(onUndo?: () => void) {
	return render(
		<ReaderToastProvider>
			<ToastHarness onUndo={onUndo} />
		</ReaderToastProvider>,
	);
}

describe("undo messages", () => {
	it("announces the message, and Undo reverses the action", () => {
		const onUndo = vi.fn();
		renderToast(onUndo);
		fireEvent.click(screen.getByRole("button", { name: "Highlight" }));

		expect(screen.getByRole("status").textContent).toContain(
			"Highlighted Romans 8:28",
		);
		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		expect(onUndo).toHaveBeenCalledOnce();
		expect(screen.getByRole("status").textContent).toBe("");
	});

	it("only offers Undo when there's something to undo, and replaces the last message", () => {
		renderToast(vi.fn());
		fireEvent.click(screen.getByRole("button", { name: "Highlight" }));
		fireEvent.click(screen.getByRole("button", { name: "Copy" }));

		expect(screen.getByRole("status").textContent).toContain(
			"Copied Romans 8:28 (KJV)",
		);
		expect(screen.getByRole("status").textContent).not.toContain("Highlighted");
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
	});

	it("goes after six seconds, but waits while the reader is focused on it", () => {
		vi.useFakeTimers();
		renderToast(vi.fn());
		fireEvent.click(screen.getByRole("button", { name: "Highlight" }));

		fireEvent.focus(screen.getByRole("button", { name: "Undo" }));
		act(() => vi.advanceTimersByTime(readerToastDuration + 1000));
		expect(screen.getByRole("status").textContent).toContain("Highlighted");

		fireEvent.blur(screen.getByRole("button", { name: "Undo" }));
		act(() => vi.advanceTimersByTime(readerToastDuration - 1));
		expect(screen.getByRole("status").textContent).toContain("Highlighted");
		act(() => vi.advanceTimersByTime(1));
		expect(screen.getByRole("status").textContent).toBe("");
	});
});

describe("settings controls", () => {
	it("makes the whole row one switch, read with its help line", () => {
		function Harness() {
			const [on, setOn] = useState(true);
			return (
				<SwitchRow
					checked={on}
					help="Short headings written by Berean Study."
					label="Show verse numbers"
					onCheckedChange={setOn}
				/>
			);
		}
		render(<Harness />);
		const toggle = screen.getByRole("switch", { name: "Show verse numbers" });

		expect(toggle.getAttribute("aria-checked")).toBe("true");
		const description = document.getElementById(
			toggle.getAttribute("aria-describedby") ?? "",
		);
		expect(description?.textContent).toBe(
			"Short headings written by Berean Study.",
		);
		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-checked")).toBe("false");
	});

	it("chooses one tile in a named group", () => {
		function Harness() {
			const [size, setSize] = useState("large");
			return (
				<ChoiceGroup label="Text size" onValueChange={setSize} value={size}>
					<ChoiceTile label="Standard" value="standard" />
					<ChoiceTile label="Large" value="large" />
					<ChoiceTile label="Larger" value="larger" />
				</ChoiceGroup>
			);
		}
		render(<Harness />);

		expect(screen.getByRole("radiogroup", { name: "Text size" })).toBeTruthy();
		expect(
			screen.getByRole("radio", { name: "Large" }).getAttribute("aria-checked"),
		).toBe("true");
		fireEvent.click(screen.getByRole("radio", { name: "Larger" }));
		expect(
			screen
				.getByRole("radio", { name: "Larger" })
				.getAttribute("aria-checked"),
		).toBe("true");
		expect(
			screen.getByRole("radio", { name: "Large" }).getAttribute("aria-checked"),
		).toBe("false");
	});
});

describe("study groups", () => {
	it("folds open and says how many notes it holds", () => {
		function Harness() {
			const [open, setOpen] = useState(false);
			return (
				<StudyGroup
					count={2}
					hint="The Greek or Hebrew words behind the English"
					name="Word meanings"
					onOpenChange={setOpen}
					open={open}
				>
					<p>work together</p>
				</StudyGroup>
			);
		}
		render(<Harness />);
		const header = screen.getByRole("button", { name: "Word meanings" });
		const details = document.getElementById(
			header.getAttribute("aria-describedby") ?? "",
		);
		expect(details?.textContent).toBe(
			"The Greek or Hebrew words behind the English. 2 items.",
		);

		expect(header.getAttribute("aria-expanded")).toBe("false");
		const panel = screen.getByText("work together").parentElement;
		expect(panel?.hidden).toBe(true);

		fireEvent.click(header);
		expect(header.getAttribute("aria-expanded")).toBe("true");
		expect(panel?.hidden).toBe(false);
	});
});

describe("state cards", () => {
	it("announces errors straight away, but not other states", () => {
		render(
			<>
				<NotAvailable
					description="We're adding the Bible one chapter at a time."
					title="Romans 7 isn't available yet"
				/>
				<ErrorCard
					description="Check that you're connected to the internet, then try again."
					title="We couldn't open Romans 8"
				/>
			</>,
		);

		expect(screen.getByRole("alert").textContent).toContain(
			"We couldn't open Romans 8",
		);
		expect(screen.getAllByRole("alert")).toHaveLength(1);
	});

	it("says what's loading in words", () => {
		render(<ReaderSkeleton label="Opening Romans 8…" />);
		expect(screen.getByRole("status").textContent).toContain(
			"Opening Romans 8…",
		);
	});
});
