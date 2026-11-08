import { createFileRoute } from "@tanstack/react-router";

import { AboutBookPage } from "@/components/bible/about-book-page";
import { aboutBookQueryOptions } from "@/queries/reader";

export const Route = createFileRoute("/_auth/bible/$book/about")({
	// The page shows its own loading and error states, so failures are left to it.
	loader: ({ context: { queryClient }, params }) =>
		queryClient
			.query(aboutBookQueryOptions(params.book))
			.catch(() => undefined),
	component: AboutRoute,
});

function AboutRoute() {
	const { book } = Route.useParams();
	return <AboutBookPage bookSlug={book} />;
}
