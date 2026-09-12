import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/account/profile/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_auth/account/profile/"!</div>;
}
