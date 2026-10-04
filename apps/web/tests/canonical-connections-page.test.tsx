import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CanonicalConnectionsPage } from "../src/components/study-tools/canonical-connections-page";

afterEach(cleanup);

describe("CanonicalConnectionsPage", () => {
	it("filters connections by category and search", () => {
		render(<CanonicalConnectionsPage />);

		fireEvent.click(screen.getByRole("button", { name: "Event" }));
		expect(
			screen.getByRole("heading", {
				name: "The Outpouring of the Spirit",
			}),
		).toBeTruthy();
		expect(
			screen.getAllByRole("heading", {
				name: "The Kingdom of God",
			}),
		).toHaveLength(1);

		fireEvent.change(screen.getByLabelText("Search canonical connections"), {
			target: { value: "no matching connection" },
		});
		expect(
			screen.getByRole("heading", { name: "No canonical connections found" }),
		).toBeTruthy();
	});

	it("updates the detail panel and saved state", () => {
		render(<CanonicalConnectionsPage />);

		const kingdomConnection = screen
			.getByRole("heading", { name: "The New Covenant" })
			.closest("button");
		expect(kingdomConnection).toBeTruthy();
		if (!kingdomConnection) return;
		fireEvent.click(kingdomConnection);
		expect(
			screen.getAllByRole("heading", {
				name: "The New Covenant",
			}),
		).toHaveLength(2);

		fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
		expect(
			screen.getByRole("button", {
				name: "Remove canonical connection from saved",
			}),
		).toBeTruthy();
	});
});
