import { createFileRoute } from "@tanstack/react-router";

import { BookPage } from "@/components/bible/book-page";
import { bookPageQueryOptions } from "@/queries/reader";

export const Route = createFileRoute("/_auth/bible/$book/")({
	// The page shows its own loading and error states, so failures are left to it.
	loader: ({ context: { queryClient }, params }) =>
		queryClient.query(bookPageQueryOptions(params.book)).catch(() => undefined),
	component: BookRoute,
});

function BookRoute() {
	const { book } = Route.useParams();
	return <BookPage bookSlug={book} />;
}
