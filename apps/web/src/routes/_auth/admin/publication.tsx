import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { PublicationPage } from "@/components/staff/scripture/proofreading/publication-page";
import {
	approvedContentQueryOptions,
	liveContentQueryOptions,
} from "@/queries/content";
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
		Promise.all([
			context.queryClient.ensureQueryData(readyToPublishQueryOptions()),
			context.queryClient.ensureQueryData(approvedContentQueryOptions()),
			context.queryClient.ensureQueryData(liveContentQueryOptions()),
		]),
	component: PublicationRoute,
});

function PublicationRoute() {
	const { viewer } = Route.useRouteContext();
	return <PublicationPage permissionKeys={viewer.permissionKeys} />;
}
