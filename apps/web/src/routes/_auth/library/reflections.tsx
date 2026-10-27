import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import {
	type ReflectionsSearch,
	ReflectionsTab,
} from "@/components/journal/reflections-tab";
import { prayerJournalCountsQueryOptions } from "@/queries/prayer-journal";
import { reflectionsQueryOptions } from "@/queries/reflections";

export const Route = createFileRoute("/_auth/library/reflections")({
	component: ReflectionsRoute,
	// "static" returns cached data at once; the page refreshes it if old.
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.query({ ...reflectionsQueryOptions(), staleTime: "static" }),
			queryClient.query({
				...prayerJournalCountsQueryOptions(),
				staleTime: "static",
			}),
		]),
	validateSearch: z.object({
		prayer: z.coerce.number().int().positive().optional(),
	}),
});

function ReflectionsRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/library/reflections" });
	const onSearchChange = useCallback(
		(next: ReflectionsSearch, options: { replace?: boolean } = {}) =>
			void navigate({ replace: options.replace, search: next, to: "." }),
		[navigate],
	);
	return <ReflectionsTab onSearchChange={onSearchChange} search={search} />;
}
