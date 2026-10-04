import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TextualNotesPage } from "../src/components/study-tools/textual-notes-page";

afterEach(cleanup);

describe("TextualNotesPage", () => {
	it("filters textual notes by search and restores the catalogue", () => {
		render(<TextualNotesPage />);

		const search = screen.getByLabelText("Search textual notes");
		fireEvent.change(search, { target: { value: "Comma Johanneum" } });

		expect(screen.getByRole("heading", { name: "1 John 5:7–8" })).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Mark 16:9–20" })).toBeNull();

		fireEvent.click(
			screen.getByRole("button", { name: "View all textual notes" }),
		);

		expect((search as HTMLInputElement).value).toBe("");
		expect(screen.getByRole("heading", { name: "Mark 16:9–20" })).toBeTruthy();
	});

	it("filters by category and provides a reset action when no notes match", () => {
		render(<TextualNotesPage />);

		fireEvent.click(screen.getByRole("button", { name: "Longer Endings" }));
		expect(screen.getByRole("heading", { name: "Mark 16:9–20" })).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Romans 5:1" })).toBeNull();

		fireEvent.change(screen.getByLabelText("Search textual notes"), {
			target: { value: "no matching note" },
		});
		expect(
			screen.getByRole("heading", { name: "No textual notes found" }),
		).toBeTruthy();

		fireEvent.click(
			screen.getByRole("button", { name: "Show all textual notes" }),
		);
		expect(screen.getByRole("heading", { name: "Mark 16:9–20" })).toBeTruthy();
	});
});
