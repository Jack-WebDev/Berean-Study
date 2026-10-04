import { createFileRoute } from "@tanstack/react-router";

import { CanonicalConnectionsPage } from "@/components/study-tools/canonical-connections-page";

export const Route = createFileRoute(
	"/_auth/study-tools/canonical-connections",
)({
	component: CanonicalConnectionsPage,
});
