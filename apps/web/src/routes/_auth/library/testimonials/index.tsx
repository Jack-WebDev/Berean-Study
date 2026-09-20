import { createFileRoute } from "@tanstack/react-router";
import { TestimoniesPage } from "@/components/testimony/testimonies-page";

export const Route = createFileRoute("/_auth/library/testimonials/")({
	component: TestimoniesPage,
});
