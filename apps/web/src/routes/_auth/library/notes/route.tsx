import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/library/notes")({
	component: NotesLayout,
});

function NotesLayout() {
	return <Outlet />;
}
