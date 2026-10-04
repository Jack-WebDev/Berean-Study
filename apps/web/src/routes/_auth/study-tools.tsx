import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/study-tools")({
	component: StudyToolsLayout,
});

function StudyToolsLayout() {
	return <Outlet />;
}
