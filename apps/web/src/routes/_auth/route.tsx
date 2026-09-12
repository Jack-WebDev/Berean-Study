import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/functions/get-viewer";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
	beforeLoad: async () => {
		const viewer = await getViewer();
		if (!viewer) {
			throw redirect({
				to: "/login",
			});
		}
		return { viewer };
	},
});

function AuthLayout() {
	const { viewer } = Route.useRouteContext();

	return (
		<AppShell permissionKeys={viewer.permissionKeys}>
			<Outlet />
		</AppShell>
	);
}
