import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { StaffSectionPage } from "@/components/staff/staff-section-page";

export const Route = createFileRoute("/_auth/admin/")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/admin", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	component: AdministrationOverviewPage,
});

function AdministrationOverviewPage() {
	const { viewer } = Route.useRouteContext();
	const item = accessibleStaffItem("/admin", viewer.permissionKeys);

	return item ? <StaffSectionPage item={item} /> : null;
}
