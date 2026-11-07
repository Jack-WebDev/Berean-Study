import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { EntryPage } from "@/components/staff/scripture/entry/entry-page";
import { entryChapterQueryOptions } from "@/queries/verse-text";

export const Route = createFileRoute("/_auth/work/scripture/")({
	beforeLoad: ({ context }) => {
		const keys = context.viewer.permissionKeys;
		if (keys.includes("scripture.enter")) return;
		throw redirect({
			to: keys.includes("scripture.proofread")
				? "/work/scripture/proofreading"
				: "/home",
		});
	},
	validateSearch: z.object({
		book: z.string().optional().catch(undefined),
		chapter: z.number().int().positive().optional().catch(undefined),
		t: z.string().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			entryChapterQueryOptions({
				abbreviation: deps.t,
				chapter: deps.chapter,
				slug: deps.book,
			}),
		),
	component: EntryRoute,
});

function EntryRoute() {
	const { book, chapter, t } = Route.useSearch();

	return <EntryPage input={{ abbreviation: t, chapter, slug: book }} />;
}
