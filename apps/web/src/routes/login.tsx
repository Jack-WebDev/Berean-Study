import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/components/auth/login/login-page";

export const Route = createFileRoute("/login")({
	component: LoginPageComponent,
});

function LoginPageComponent() {
	return <LoginPage />;
}
