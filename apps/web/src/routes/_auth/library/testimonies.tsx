import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
	FaithRecordsPage,
	type FaithView,
} from "@/components/faith/faith-records-page";

export const Route = createFileRoute("/_auth/library/testimonies")({
	component: TestimoniesRoute,
});

function TestimoniesRoute() {
	const navigate = useNavigate({ from: "/library/testimonies" });

	return (
		<FaithRecordsPage
			onViewChange={(view: FaithView) =>
				navigate({
					to: view === "prayers" ? "/library/prayers" : "/library/testimonies",
				})
			}
			view="testimonies"
		/>
	);
}
