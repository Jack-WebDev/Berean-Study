import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { EntryPage } from "@/components/staff/scripture/entry/entry-page";
import { opensEntryEditor } from "@/components/staff/scripture/entry/entry-routing";
import { EntryTraditionsPage } from "@/components/staff/scripture/entry/entry-traditions-page";
import {
	entryChapterQueryOptions,
	entryTraditionsQueryOptions,
} from "@/queries/verse-text";

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
		canon: z.string().optional().catch(undefined),
		chapter: z.number().int().positive().optional().catch(undefined),
		t: z.string().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: async ({ context, deps }) => {
		if (opensEntryEditor(deps)) {
			await context.queryClient.query({
				...entryChapterQueryOptions({
					abbreviation: deps.t,
					canon: deps.canon,
					chapter: deps.chapter,
					slug: deps.book,
				}),
				staleTime: "static",
			});
			return;
		}
		await context.queryClient.query({
			...entryTraditionsQueryOptions(),
			staleTime: "static",
		});
	},
	component: EntryRoute,
});

function EntryRoute() {
	const search = Route.useSearch();
	const { book, canon, chapter, t } = search;

	if (!opensEntryEditor(search)) return <EntryTraditionsPage />;

	return <EntryPage input={{ abbreviation: t, canon, chapter, slug: book }} />;
}
