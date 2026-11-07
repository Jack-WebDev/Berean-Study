import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { ChaptersPage } from "@/components/staff/scripture/chapters-page";
import { canReadScriptureData } from "@/components/staff/scripture/scripture-access";
import { bookStructureQueryOptions } from "@/queries/scripture-data";

export const Route = createFileRoute(
	"/_auth/admin/scripture/$bookSlug/chapters",
)({
	beforeLoad: ({ context }) => {
		if (!canReadScriptureData(context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		chapter: z.number().int().positive().optional().catch(undefined),
		verse: z.number().int().positive().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps, params }) =>
		context.queryClient.query({
			...bookStructureQueryOptions({
				chapter: deps.chapter,
				slug: params.bookSlug,
				verse: deps.verse,
			}),
			staleTime: "static",
		}),
	component: ChaptersRoute,
});

function ChaptersRoute() {
	const { bookSlug } = Route.useParams();
	const { chapter, verse } = Route.useSearch();
	const { viewer } = Route.useRouteContext();

	return (
		<ChaptersPage
			chapter={chapter}
			permissionKeys={viewer.permissionKeys}
			slug={bookSlug}
			verse={verse}
		/>
	);
}
