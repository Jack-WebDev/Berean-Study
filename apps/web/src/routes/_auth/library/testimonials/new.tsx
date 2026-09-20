import { createFileRoute } from "@tanstack/react-router";
import { NewTestimonyPage } from "@/components/testimony/new-testimony-page";
export const Route = createFileRoute("/_auth/library/testimonials/new")({
	component: NewTestimonyPage,
});
