import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CrossReferencesPage } from "../src/components/study-tools/cross-references-page";

afterEach(cleanup);

describe("CrossReferencesPage", () => {
	it("filters suggested references by search and restores the catalogue", () => {
		render(<CrossReferencesPage />);

		const search = screen.getByLabelText("Search references");
		fireEvent.change(search, { target: { value: "Isaiah" } });

		expect(
			screen.getByRole("heading", { name: "Isaiah 53 ↔ 1 Peter 2" }),
		).toBeTruthy();
		expect(
			screen.queryByRole("heading", { name: "Psalm 22 ↔ Matthew 27" }),
		).toBeNull();

		fireEvent.click(
			screen.getByRole("button", { name: "View all references" }),
		);

		expect((search as HTMLInputElement).value).toBe("");
		expect(
			screen.getByRole("heading", { name: "Psalm 22 ↔ Matthew 27" }),
		).toBeTruthy();
	});

	it("filters by category and presents a reset action when no references match", () => {
		render(<CrossReferencesPage />);

		fireEvent.click(screen.getByRole("button", { name: "Pauline Letters" }));
		expect(
			screen.getByRole("heading", { name: "Habakkuk 2:4 ↔ Romans 1:17" }),
		).toBeTruthy();
		expect(
			screen.queryByRole("heading", { name: "Isaiah 53 ↔ 1 Peter 2" }),
		).toBeNull();

		fireEvent.change(screen.getByLabelText("Search references"), {
			target: { value: "no matching reference" },
		});

		expect(
			screen.getByRole("heading", { name: "No references found" }),
		).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: "Show all references" }),
		);
		expect(
			screen.getByRole("heading", { name: "Psalm 22 ↔ Matthew 27" }),
		).toBeTruthy();
	});
});
