import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/account/reading/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_auth/account/reading/"!</div>;
}
