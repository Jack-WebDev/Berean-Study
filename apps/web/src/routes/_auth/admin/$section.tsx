import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { StaffSectionPage } from "@/components/staff/staff-section-page";

export const Route = createFileRoute("/_auth/admin/$section")({
	beforeLoad: ({ context, params }) => {
		if (
			!accessibleStaffItem(
				`/admin/${params.section}`,
				context.viewer.permissionKeys,
			)
		) {
			throw redirect({ to: "/home" });
		}
	},
	component: AdministrationSectionPage,
});

function AdministrationSectionPage() {
	const { viewer } = Route.useRouteContext();
	const item = accessibleStaffItem(
		`/admin/${Route.useParams().section}`,
		viewer.permissionKeys,
	);

	return item ? <StaffSectionPage item={item} /> : null;
}
