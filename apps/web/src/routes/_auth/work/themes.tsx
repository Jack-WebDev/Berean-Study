import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import {
	ThemeEditorPage,
	ThemesListPage,
} from "@/components/staff/study/themes-page";
import {
	themeEditorQueryOptions,
	themesQueryOptions,
} from "@/queries/study-content";

export const Route = createFileRoute("/_auth/work/themes")({
	beforeLoad: ({ context }) => {
		const keys = context.viewer.permissionKeys;
		if (!keys.includes("content.write") && !keys.includes("content.revise")) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		new: z.boolean().optional().catch(undefined),
		passage: z.string().max(100).optional().catch(undefined),
		q: z.string().max(200).optional().catch(undefined),
		theme: z.number().int().positive().optional().catch(undefined),
	}),
	loaderDeps: ({ search: { new: isNew, q, theme } }) => ({ isNew, q, theme }),
	loader: async ({ context, deps }) => {
		if (deps.theme || deps.isNew) {
			await context.queryClient.query({
				...themeEditorQueryOptions(deps.theme ?? null),
				staleTime: "static",
			});
			return;
		}
		await context.queryClient.query({
			...themesQueryOptions(deps.q),
			staleTime: "static",
		});
	},
	component: ThemesRoute,
});

function ThemesRoute() {
	const { new: isNew, passage, q, theme } = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	if (!theme && !isNew) return <ThemesListPage search={q} />;
	return (
		<ThemeEditorPage
			initialPassage={passage}
			key={theme ?? "new"}
			permissionKeys={viewer.permissionKeys}
			themeId={theme ?? null}
		/>
	);
}
