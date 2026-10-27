import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import {
	type PrayersSearch,
	PrayersTab,
} from "@/components/journal/prayers-tab";
import { prayerJournalCountsQueryOptions } from "@/queries/prayer-journal";
import { prayersQueryOptions } from "@/queries/prayers";

export const Route = createFileRoute("/_auth/library/prayers")({
	component: PrayersRoute,
	// "static" returns cached data at once; the page refreshes it if old.
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.query({ ...prayersQueryOptions(), staleTime: "static" }),
			queryClient.query({
				...prayerJournalCountsQueryOptions(),
				staleTime: "static",
			}),
		]),
	validateSearch: z.object({
		filter: z.enum(["mine", "others"]).optional(),
		prayer: z.coerce.number().int().positive().optional(),
	}),
});

function PrayersRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/library/prayers" });
	const onSearchChange = useCallback(
		(next: PrayersSearch, options: { replace?: boolean } = {}) =>
			void navigate({ replace: options.replace, search: next, to: "." }),
		[navigate],
	);
	return <PrayersTab onSearchChange={onSearchChange} search={search} />;
}
