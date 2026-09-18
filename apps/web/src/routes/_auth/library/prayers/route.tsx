import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/library/prayers")({
	component: PrayersLayout,
});

function PrayersLayout() {
	return <Outlet />;
}
