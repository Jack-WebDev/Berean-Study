import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import ResetPasswordPage from "@/components/auth/reset-password-page";

const searchSchema = z.object({
	error: z.string().optional(),
	token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPageComponent,
	validateSearch: searchSchema,
});

function ResetPasswordPageComponent() {
	return <ResetPasswordPage {...Route.useSearch()} />;
}
