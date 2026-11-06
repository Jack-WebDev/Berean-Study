import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { StaffSectionPage } from "@/components/staff/staff-section-page";

export const Route = createFileRoute("/_auth/work/$section")({
	beforeLoad: ({ context, params }) => {
		if (
			!accessibleStaffItem(
				`/work/${params.section}`,
				context.viewer.permissionKeys,
			)
		) {
			throw redirect({ to: "/home" });
		}
	},
	component: WorkSectionPage,
});

function WorkSectionPage() {
	const { viewer } = Route.useRouteContext();
	const item = accessibleStaffItem(
		`/work/${Route.useParams().section}`,
		viewer.permissionKeys,
	);

	return item ? <StaffSectionPage item={item} /> : null;
}
