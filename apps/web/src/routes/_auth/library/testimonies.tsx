import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import {
	type TestimoniesSearch,
	TestimoniesTab,
} from "@/components/journal/testimonies-tab";
import { prayerJournalCountsQueryOptions } from "@/queries/prayer-journal";
import { testimoniesQueryOptions } from "@/queries/testimonies";

export const Route = createFileRoute("/_auth/library/testimonies")({
	component: TestimoniesRoute,
	// "static" returns cached data at once; the page refreshes it if old.
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.query({ ...testimoniesQueryOptions(), staleTime: "static" }),
			queryClient.query({
				...prayerJournalCountsQueryOptions(),
				staleTime: "static",
			}),
		]),
	validateSearch: z.object({
		filter: z.enum(["private", "shared"]).optional(),
		sort: z.enum(["happened", "oldest"]).optional(),
		testimony: z.coerce.number().int().positive().optional(),
	}),
});

function TestimoniesRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/library/testimonies" });
	const onSearchChange = useCallback(
		(next: TestimoniesSearch, options: { replace?: boolean } = {}) =>
			void navigate({ replace: options.replace, search: next, to: "." }),
		[navigate],
	);
	return <TestimoniesTab onSearchChange={onSearchChange} search={search} />;
}
