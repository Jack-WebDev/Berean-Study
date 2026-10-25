import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import { NotesPage } from "@/components/notes/notes-page";
import type { NotesSearch } from "@/components/notes/types";

const idsSchema = z
	.array(z.coerce.number().int().positive())
	.max(50)
	.optional();

export const Route = createFileRoute("/_auth/library/notes/")({
	component: NotesRoute,
	validateSearch: z.object({
		books: idsSchema,
		collections: idsSchema,
		note: z.coerce.number().int().positive().optional(),
		passage: z.coerce.number().int().positive().optional(),
		q: z.string().trim().max(200).optional(),
		return: z.coerce.number().int().positive().optional(),
		sort: z.enum(["created", "title", "updated"]).optional(),
		tags: idsSchema,
		view: z.enum(["all", "drafts", "linked"]).optional(),
	}),
});

function NotesRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/library/notes" });
	const onSearchChange = useCallback(
		(next: NotesSearch, options: { replace?: boolean } = {}) =>
			void navigate({ replace: options.replace, search: next, to: "." }),
		[navigate],
	);

	return <NotesPage onSearchChange={onSearchChange} search={search} />;
}
