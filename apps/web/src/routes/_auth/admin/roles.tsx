import { createFileRoute, redirect } from "@tanstack/react-router";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { RolesPage } from "@/components/staff/roles/roles-page";
import { roleMatrixQueryOptions } from "@/queries/roles";

export const Route = createFileRoute("/_auth/admin/roles")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/admin/roles", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(roleMatrixQueryOptions()),
	component: RolesPage,
});
