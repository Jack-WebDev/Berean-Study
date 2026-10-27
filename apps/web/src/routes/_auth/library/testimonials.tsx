import { createFileRoute, redirect } from "@tanstack/react-router";

// The testimonies page used to live here; keep old links working.
export const Route = createFileRoute("/_auth/library/testimonials")({
	beforeLoad: () => {
		throw redirect({ replace: true, to: "/library/testimonies" });
	},
});
