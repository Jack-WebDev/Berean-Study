import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { ContentIssuesPage } from "@/components/staff/content/work-pages";
import { openIssuesQueryOptions } from "@/queries/content";

export const Route = createFileRoute("/_auth/admin/content-issues")({
	beforeLoad: ({ context }) => {
		if (
			!accessibleStaffItem(
				"/admin/content-issues",
				context.viewer.permissionKeys,
			)
		) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context }) =>
		context.queryClient.query({
			...openIssuesQueryOptions(),
			staleTime: "static",
		}),
	component: ContentIssuesPage,
});
