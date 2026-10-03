import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	getPasswordStrength,
	PasswordStrengthIndicator,
} from "../src/components/auth/password-strength";

describe("password strength", () => {
	it.each([
		["Abcdefghijkl", "Fair"],
		["lowercase123!", "Good"],
		["StrongPass1!", "Strong"],
	] as const)("rates %s as %s", (password, label) => {
		expect(getPasswordStrength(password).label).toBe(label);
	});

	it("uses yellow for the Good strength tier", () => {
		render(<PasswordStrengthIndicator password="lowercase123!" />);

		expect(screen.getByText("Good").className).toContain("text-yellow-700");
		expect(screen.getByRole("progressbar").children[2]?.className).toContain(
			"bg-yellow-500",
		);
	});
});
