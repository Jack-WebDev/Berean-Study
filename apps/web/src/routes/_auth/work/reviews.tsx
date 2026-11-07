import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { ReviewsPage } from "@/components/staff/content/work-pages";
import { reviewQueueQueryOptions } from "@/queries/content";

export const Route = createFileRoute("/_auth/work/reviews")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/work/reviews", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(reviewQueueQueryOptions()),
	component: ReviewsPage,
});
