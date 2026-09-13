import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { VerifyEmailPage } from "@/components/auth/verify-email/verify-email-page";

const verifyEmailSearch = z.object({
	email: z.string().email().catch(""),
});

export const Route = createFileRoute("/verify-email")({
	validateSearch: verifyEmailSearch,
	component: VerifyEmailRoute,
});

function VerifyEmailRoute() {
	const { email } = Route.useSearch();

	return <VerifyEmailPage email={email} />;
}
