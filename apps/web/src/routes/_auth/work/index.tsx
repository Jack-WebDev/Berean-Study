import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { MyWorkPage } from "@/components/staff/content/work-pages";
import { myWorkQueryOptions } from "@/queries/content";

export const Route = createFileRoute("/_auth/work/")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/work", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(myWorkQueryOptions()),
	component: MyWorkPage,
});
