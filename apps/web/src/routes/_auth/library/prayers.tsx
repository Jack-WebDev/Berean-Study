import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
	FaithRecordsPage,
	type FaithView,
} from "@/components/faith/faith-records-page";

export const Route = createFileRoute("/_auth/library/prayers")({
	component: PrayersRoute,
});

function PrayersRoute() {
	const navigate = useNavigate({ from: "/library/prayers" });

	return (
		<FaithRecordsPage
			onViewChange={(view: FaithView) =>
				navigate({
					to: view === "prayers" ? "/library/prayers" : "/library/testimonies",
				})
			}
			view="prayers"
		/>
	);
}
