import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OriginalLanguagePage } from "../src/components/study-tools/original-language-page";

afterEach(cleanup);

describe("OriginalLanguagePage", () => {
	it("filters word studies by search and restores the catalogue", () => {
		render(<OriginalLanguagePage />);

		const search = screen.getByLabelText("Search original language studies");
		fireEvent.change(search, { target: { value: "hesed" } });

		expect(screen.getByText("חסד")).toBeTruthy();
		expect(screen.queryByText("λόγος")).toBeNull();

		fireEvent.click(
			screen.getByRole("button", { name: "View all word studies" }),
		);

		expect((search as HTMLInputElement).value).toBe("");
		expect(screen.getByText("λόγος")).toBeTruthy();
	});

	it("filters by language and provides a reset action when no studies match", () => {
		render(<OriginalLanguagePage />);

		fireEvent.click(screen.getByRole("button", { name: "Hebrew" }));
		expect(screen.getByText("חסד")).toBeTruthy();
		expect(screen.queryByText("λόγος")).toBeNull();

		fireEvent.change(
			screen.getByLabelText("Search original language studies"),
			{
				target: { value: "no matching word" },
			},
		);
		expect(
			screen.getByRole("heading", { name: "No word studies found" }),
		).toBeTruthy();

		fireEvent.click(
			screen.getByRole("button", { name: "Show all word studies" }),
		);
		expect(screen.getByText("λόγος")).toBeTruthy();
	});
});
