import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import {
	LanguagePage,
	LanguageStartPage,
	languageTabs,
} from "@/components/staff/study/language-page";
import {
	passageLanguageQueryOptions,
	studyRecordQueryOptions,
} from "@/queries/study-content";

export const Route = createFileRoute("/_auth/work/language")({
	beforeLoad: ({ context }) => {
		if (!context.viewer.permissionKeys.includes("content.original_language")) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		id: z.string().max(100).optional().catch(undefined),
		passage: z.string().max(100).optional().catch(undefined),
		tab: z.enum(languageTabs).optional().catch(undefined),
	}),
	loaderDeps: ({ search: { id, passage, tab } }) => ({ id, passage, tab }),
	loader: async ({ context, deps }) => {
		if (!deps.passage) return;
		const load = { staleTime: "static" } as const;
		await Promise.all([
			context.queryClient.query({
				...passageLanguageQueryOptions(deps.passage),
				...load,
			}),
			deps.id
				? context.queryClient.query({
						...studyRecordQueryOptions({
							kind: deps.tab ?? "original_language_note",
							scopeKey: deps.id,
						}),
						...load,
					})
				: null,
		]);
	},
	component: LanguageRoute,
});

function LanguageRoute() {
	const { id, passage, tab } = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	if (!passage) return <LanguageStartPage initialPassage="" tab={tab} />;
	return (
		<LanguagePage
			id={id}
			passage={passage}
			permissionKeys={viewer.permissionKeys}
			tab={tab ?? "original_language_note"}
		/>
	);
}
