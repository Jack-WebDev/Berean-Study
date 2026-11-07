import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { PublicationPage } from "@/components/staff/scripture/proofreading/publication-page";
import { readyToPublishQueryOptions } from "@/queries/verse-text";

export const Route = createFileRoute("/_auth/admin/publication")({
	beforeLoad: ({ context }) => {
		if (
			!accessibleStaffItem("/admin/publication", context.viewer.permissionKeys)
		) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(readyToPublishQueryOptions()),
	component: PublicationRoute,
});

function PublicationRoute() {
	const { viewer } = Route.useRouteContext();
	return <PublicationPage permissionKeys={viewer.permissionKeys} />;
}
