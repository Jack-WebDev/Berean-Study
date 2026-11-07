import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { OverviewPage } from "@/components/staff/overview/overview-page";
import { adminOverviewQueryOptions } from "@/queries/staff-queues";

export const Route = createFileRoute("/_auth/admin/")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/admin", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context }) =>
		context.queryClient.query({
			...adminOverviewQueryOptions(),
			staleTime: "static",
		}),
	component: OverviewPage,
});
