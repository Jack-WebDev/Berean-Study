import { createFileRoute } from "@tanstack/react-router";

import { LibraryPage } from "@/components/library/library-page";

export const Route = createFileRoute("/_auth/library/")({
	component: LibraryRoute,
});

function LibraryRoute() {
	return <LibraryPage />;
}
