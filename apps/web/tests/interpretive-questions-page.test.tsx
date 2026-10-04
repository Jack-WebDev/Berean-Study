import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InterpretiveQuestionsPage } from "../src/components/study-tools/interpretive-questions-page";

afterEach(cleanup);

describe("InterpretiveQuestionsPage", () => {
	it("filters featured questions by search and restores the catalogue", () => {
		render(<InterpretiveQuestionsPage />);

		const search = screen.getByLabelText("Search interpretive questions");
		fireEvent.change(search, { target: { value: "restrainer" } });

		expect(
			screen.getByRole("heading", {
				name: "Who is the restrainer in 2 Thessalonians 2?",
			}),
		).toBeTruthy();
		expect(
			screen.queryByRole("heading", {
				name: "Who are the ‘sons of God’ in Genesis 6?",
			}),
		).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "View all questions" }));

		expect((search as HTMLInputElement).value).toBe("");
		expect(
			screen.getByRole("heading", {
				name: "Who are the ‘sons of God’ in Genesis 6?",
			}),
		).toBeTruthy();
	});

	it("filters by category and provides a reset action when no questions match", () => {
		render(<InterpretiveQuestionsPage />);

		fireEvent.click(screen.getByRole("button", { name: "Pauline Letters" }));
		expect(
			screen.getByRole("heading", {
				name: "What is Paul discussing in Romans 9?",
			}),
		).toBeTruthy();
		expect(
			screen.queryByRole("heading", {
				name: "What is the ‘rock’ in Matthew 16:18?",
			}),
		).toBeNull();

		fireEvent.change(screen.getByLabelText("Search interpretive questions"), {
			target: { value: "no matching question" },
		});
		expect(
			screen.getByRole("heading", { name: "No questions found" }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Show all questions" }));
		expect(
			screen.getByRole("heading", {
				name: "Who are the ‘sons of God’ in Genesis 6?",
			}),
		).toBeTruthy();
	});
});
