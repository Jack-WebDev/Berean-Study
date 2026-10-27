import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getViewer } from "@/functions/get-viewer";

/**
 * Signed-in pages shown without the app's sidebar and toolbar, such as the
 * full-screen journal editor.
 */
export const Route = createFileRoute("/_focus")({
	component: Outlet,
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
