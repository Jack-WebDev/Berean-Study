import { createFileRoute } from "@tanstack/react-router";
import { FaithRecordsPage } from "@/components/prayer/faith-records-page";

export const Route = createFileRoute("/_auth/library/testimonies")({
	component: TestimoniesRoute,
});

function TestimoniesRoute() {
	return <FaithRecordsPage />;
}
