import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { StaffSectionPage } from "@/components/staff/staff-section-page";

export const Route = createFileRoute("/_auth/work/")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/work", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	component: MyWorkPage,
});

function MyWorkPage() {
	const { viewer } = Route.useRouteContext();
	const item = accessibleStaffItem("/work", viewer.permissionKeys);

	return item ? <StaffSectionPage item={item} /> : null;
}
