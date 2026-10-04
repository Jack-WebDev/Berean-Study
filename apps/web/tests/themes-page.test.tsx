import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ThemesPage } from "../src/components/study-tools/themes-page";

afterEach(cleanup);

describe("ThemesPage", () => {
	it("filters themes by search text and restores the full catalogue", () => {
		render(<ThemesPage />);

		const search = screen.getByLabelText("Search themes");
		fireEvent.change(search, { target: { value: "wisdom" } });

		expect(screen.getByRole("heading", { name: "Wisdom" })).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Covenant" })).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "All Themes" }));

		expect((search as HTMLInputElement).value).toBe("");
		expect(screen.getByRole("heading", { name: "Covenant" })).toBeTruthy();
	});

	it("filters by category and presents a recovery action for empty results", () => {
		render(<ThemesPage />);

		fireEvent.click(screen.getByRole("button", { name: "Old Testament" }));
		expect(screen.getByRole("heading", { name: "Temple" })).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Grace" })).toBeNull();

		fireEvent.change(screen.getByLabelText("Search themes"), {
			target: { value: "no matching theme" },
		});

		expect(
			screen.getByRole("heading", { name: "No themes found" }),
		).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Show all themes" }));
		expect(screen.getByRole("heading", { name: "Grace" })).toBeTruthy();
	});
});
