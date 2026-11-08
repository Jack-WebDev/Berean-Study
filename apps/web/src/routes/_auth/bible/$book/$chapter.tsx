import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ReaderPage } from "@/components/reader/reader-page";
import {
	readerChapterQueryOptions,
	readingPlaceQueryOptions,
	readingPreferencesQueryOptions,
} from "@/queries/reader";

const ignoreError = () => undefined;

export const Route = createFileRoute("/_auth/bible/$book/$chapter")({
	params: {
		// A chapter that isn't a number becomes 0, which the page explains kindly.
		parse: ({ book, chapter }) => ({
			book,
			chapter: z.coerce
				.number()
				.int()
				.positive()
				.max(200)
				.catch(0)
				.parse(chapter),
		}),
		stringify: ({ book, chapter }) => ({ book, chapter: String(chapter) }),
	},
	validateSearch: z.object({
		/** Arrived from a search, so mark the verse. */
		from: z.enum(["search"]).optional().catch(undefined),
		translation: z.string().trim().min(1).max(20).optional().catch(undefined),
		/** Scroll to this verse. */
		verse: z.coerce
			.number()
			.int()
			.positive()
			.max(200)
			.optional()
			.catch(undefined),
	}),
	loaderDeps: ({ search }) => ({ translation: search.translation }),
	// The page shows its own loading and error states, so failures are left to it.
	loader: ({ context: { queryClient }, deps, params }) =>
		Promise.all([
			queryClient.query(readingPreferencesQueryOptions()).catch(ignoreError),
			queryClient.query(readingPlaceQueryOptions()).catch(ignoreError),
			params.chapter > 0
				? queryClient
						.query(
							readerChapterQueryOptions({
								bookSlug: params.book,
								chapter: params.chapter,
								translationAbbreviation: deps.translation,
							}),
						)
						.catch(ignoreError)
				: undefined,
		]),
	component: ReaderRoute,
});

function ReaderRoute() {
	const { book, chapter } = Route.useParams();
	const { from, translation, verse } = Route.useSearch();
	return (
		<ReaderPage
			arrivedFromSearch={from === "search"}
			bookSlug={book}
			chapter={chapter}
			// A new chapter starts fresh: no leftover selection or open sheet.
			key={`${book}/${chapter}/${translation ?? ""}`}
			translationAbbreviation={translation}
			verse={verse}
		/>
	);
}
