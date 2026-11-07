import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { AssignmentsPage } from "@/components/staff/content/work-pages";
import { assignmentsQueryOptions } from "@/queries/content";

export const Route = createFileRoute("/_auth/work/assignments")({
	beforeLoad: ({ context }) => {
		if (
			!accessibleStaffItem("/work/assignments", context.viewer.permissionKeys)
		) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context }) =>
		context.queryClient.query({
			...assignmentsQueryOptions(),
			staleTime: "static",
		}),
	component: AssignmentsPage,
});
