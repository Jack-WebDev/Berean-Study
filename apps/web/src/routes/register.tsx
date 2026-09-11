import { createFileRoute } from "@tanstack/react-router";
import RegisterPage from "@/components/auth/register/register-page";

export const Route = createFileRoute("/register")({
	component: RegisterPageComponent,
});

function RegisterPageComponent() {
	return <RegisterPage />;
}
