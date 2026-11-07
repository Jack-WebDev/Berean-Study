import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { EditorialQueuePage } from "@/components/staff/content/work-pages";
import {
	assignablePeopleQueryOptions,
	editorialQueueQueryOptions,
} from "@/queries/content";

export const Route = createFileRoute("/_auth/admin/editorial/")({
	beforeLoad: ({ context }) => {
		if (
			!accessibleStaffItem("/admin/editorial", context.viewer.permissionKeys)
		) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(editorialQueueQueryOptions()),
			context.queryClient.ensureQueryData(assignablePeopleQueryOptions()),
		]),
	component: EditorialQueuePage,
});
