import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import {
	CollectionsPage,
	type CollectionsSearch,
} from "@/components/collections/collections-page";

export const Route = createFileRoute("/_auth/library/collections/")({
	component: CollectionsRoute,
	// An unknown value falls back to the default rather than breaking the page.
	validateSearch: z.object({
		filter: z
			.enum(["all", "pinned", "project", "list", "teaching", "shared"])
			.optional()
			.catch(undefined),
		sort: z.enum(["updated", "name", "size"]).optional().catch(undefined),
		view: z.enum(["grid", "list"]).optional().catch(undefined),
	}),
});

function CollectionsRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/library/collections/" });
	const onSearchChange = useCallback(
		(next: CollectionsSearch) =>
			void navigate({ replace: true, search: next, to: "." }),
		[navigate],
	);

	return <CollectionsPage onSearchChange={onSearchChange} search={search} />;
}
