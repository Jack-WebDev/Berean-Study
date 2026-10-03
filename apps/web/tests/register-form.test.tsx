import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegisterForm from "../src/components/auth/register/register-form";
import { FormDraftsProvider } from "../src/components/form-drafts";

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		signUp: {
			email: vi.fn(),
		},
	},
}));

afterEach(() => {
	cleanup();
});

function renderForm() {
	render(
		<FormDraftsProvider>
			<RegisterForm />
		</FormDraftsProvider>,
	);
}

function input(label: string) {
	return screen.getByLabelText(label) as HTMLInputElement;
}

describe("RegisterForm", () => {
	it("unlocks each field after its predecessor is complete", () => {
		renderForm();

		const name = input("Name");
		const email = input("Email");
		const password = input("Password");
		const confirmation = input("Confirm password");
		const submit = screen.getByRole("button", { name: "Create account" });

		expect(email.disabled).toBe(true);
		expect(password.disabled).toBe(true);
		expect(confirmation.disabled).toBe(true);
		expect((submit as HTMLButtonElement).disabled).toBe(true);

		fireEvent.change(name, { target: { value: "Jack" } });
		expect(email.disabled).toBe(true);

		fireEvent.change(name, { target: { value: "Jacky" } });
		expect(email.disabled).toBe(false);

		fireEvent.change(email, { target: { value: "invalid" } });
		expect(password.disabled).toBe(true);

		fireEvent.change(email, { target: { value: "jacky@example.com" } });
		expect(password.disabled).toBe(false);

		fireEvent.change(password, { target: { value: "lowercase123!" } });
		expect(confirmation.disabled).toBe(false);

		fireEvent.change(confirmation, { target: { value: "does-not-match" } });
		expect((submit as HTMLButtonElement).disabled).toBe(true);

		fireEvent.change(confirmation, { target: { value: "lowercase123!" } });
		expect((submit as HTMLButtonElement).disabled).toBe(false);
	});

	it("re-locks later fields without clearing their values", () => {
		renderForm();

		const name = input("Name");
		const email = input("Email");
		const password = input("Password");
		const confirmation = input("Confirm password");

		fireEvent.change(name, { target: { value: "Jacky" } });
		fireEvent.change(email, { target: { value: "jacky@example.com" } });
		fireEvent.change(password, { target: { value: "lowercase123!" } });
		fireEvent.change(confirmation, { target: { value: "lowercase123!" } });
		fireEvent.change(name, { target: { value: "Jack" } });

		expect(email.disabled).toBe(true);
		expect(password.disabled).toBe(true);
		expect(confirmation.disabled).toBe(true);
		expect(email.value).toBe("jacky@example.com");
		expect(password.value).toBe("lowercase123!");
		expect(confirmation.value).toBe("lowercase123!");
	});
});
