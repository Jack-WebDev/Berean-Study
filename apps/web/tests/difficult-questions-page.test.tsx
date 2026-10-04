import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DifficultQuestionsPage } from "../src/components/study-tools/difficult-questions-page";

afterEach(cleanup);

describe("DifficultQuestionsPage", () => {
	it("filters questions by topic and search", () => {
		render(<DifficultQuestionsPage />);

		fireEvent.click(screen.getByRole("button", { name: "Violence" }));
		expect(
			screen.getByRole("heading", {
				name: "How can a loving God command violence in the Old Testament?",
			}),
		).toBeTruthy();
		expect(
			screen.queryByRole("heading", {
				name: "Why did God harden Pharaoh's heart?",
			}),
		).toBeNull();

		fireEvent.change(screen.getByLabelText("Search difficult questions"), {
			target: { value: "no matching question" },
		});
		expect(
			screen.getByRole("heading", { name: "No difficult questions found" }),
		).toBeTruthy();
	});

	it("updates the displayed question and save state", () => {
		render(<DifficultQuestionsPage />);

		const pharaohQuestion = screen
			.getByRole("heading", { name: "Why did God harden Pharaoh's heart?" })
			.closest("button");
		expect(pharaohQuestion).toBeTruthy();
		if (!pharaohQuestion) return;
		fireEvent.click(pharaohQuestion);
		expect(
			screen.getAllByRole("heading", {
				name: "Why did God harden Pharaoh's heart?",
			}),
		).toHaveLength(2);

		const saveButton = screen.getByRole("button", {
			name: "Save question",
		});
		fireEvent.click(saveButton);
		expect(
			screen.getByRole("button", {
				name: "Remove difficult question from saved",
			}),
		).toBeTruthy();
	});
});
