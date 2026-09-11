import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import ResetPasswordPage from "@/components/auth/reset-password/reset-password-page";

const searchSchema = z.object({
	email: z.email().optional(),
});

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPageComponent,
	validateSearch: searchSchema,
});

function ResetPasswordPageComponent() {
	return <ResetPasswordPage {...Route.useSearch()} />;
}
