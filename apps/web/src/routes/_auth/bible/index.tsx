import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { BrowsePage } from "@/components/bible/browse-page";
import { Welcome } from "@/components/bible/welcome";
import { getPassageStart } from "@/functions/reader";
import {
	canonBooksQueryOptions,
	continueReadingQueryOptions,
	readingPreferencesQueryOptions,
} from "@/queries/reader";

const ignoreError = () => undefined;

export const Route = createFileRoute("/_auth/bible/")({
	component: BrowseRoute,
	validateSearch: z.object({
		passage: z
			.union([z.coerce.number().int().positive(), z.string().trim().min(1)])
			.optional(),
	}),
	loaderDeps: ({ search }) => ({ passage: search.passage }),
	// Notes, prayers and the journal link to /bible?passage=12. Those open the
	// reading page at the passage's first verse instead.
	loader: async ({ context: { queryClient }, deps }) => {
		if (typeof deps.passage === "number") {
			const start = await getPassageStart({
				data: { passageId: deps.passage },
			}).catch(() => null);
			if (start) {
				throw redirect({
					params: { book: start.bookSlug, chapter: start.chapter },
					replace: true,
					search: { verse: start.verse },
					to: "/bible/$book/$chapter",
				});
			}
		}
		// The page shows its own loading and error states, so failures are left to it.
		await Promise.all([
			queryClient.query(readingPreferencesQueryOptions()).catch(ignoreError),
			queryClient.query(canonBooksQueryOptions()).catch(ignoreError),
			queryClient.query(continueReadingQueryOptions()).catch(ignoreError),
		]);
	},
});

function BrowseRoute() {
	const { passage } = Route.useSearch();
	const preferences = useQuery(readingPreferencesQueryOptions());
	const place = useQuery(continueReadingQueryOptions());
	// The welcome is for someone opening the Bible for the first time. Anyone
	// who has already read a chapter has found their way, so they skip it.
	const firstVisit =
		preferences.data &&
		!preferences.data.welcomeCompleted &&
		place.isSuccess &&
		place.data === null;
	return (
		<>
			{/* Reaching here with a passage means its verses couldn't be found. */}
			<BrowsePage passageNotFound={passage !== undefined} />
			{firstVisit ? <Welcome preferences={preferences.data} /> : null}
		</>
	);
}
