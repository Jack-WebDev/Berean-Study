import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ComparePassagesPage } from "../src/components/study-tools/compare-passages-page";

afterEach(cleanup);

describe("ComparePassagesPage", () => {
	it("swaps the selected passage references", () => {
		render(<ComparePassagesPage />);

		const firstPassage = screen.getByLabelText("Passage 1") as HTMLInputElement;
		const secondPassage = screen.getByLabelText(
			"Passage 2",
		) as HTMLInputElement;
		expect(firstPassage.value).toBe("Ephesians 2:8–9");
		expect(secondPassage.value).toBe("Titus 3:4–7");

		fireEvent.click(screen.getByRole("button", { name: "Swap" }));

		expect(firstPassage.value).toBe("Titus 3:4–7");
		expect(secondPassage.value).toBe("Ephesians 2:8–9");
	});

	it("updates the selected reference and offers share feedback", () => {
		render(<ComparePassagesPage />);

		fireEvent.change(screen.getByLabelText("Passage 1"), {
			target: { value: "Romans 3:23–24" },
		});
		expect(
			screen.getByRole("heading", { name: "Romans 3:23–24" }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Share" }));
		expect(screen.getByRole("button", { name: "Link copied" })).toBeTruthy();
	});
});
