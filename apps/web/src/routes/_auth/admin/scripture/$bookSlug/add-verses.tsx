import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { AddVersesPage } from "@/components/staff/foundations/add-verses-page";
import { bookStructureQueryOptions } from "@/queries/scripture-data";

export const Route = createFileRoute(
	"/_auth/admin/scripture/$bookSlug/add-verses",
)({
	beforeLoad: ({ context }) => {
		if (!context.viewer.permissionKeys.includes("scripture.manage")) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		chapter: z.number().int().positive().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps, params }) =>
		context.queryClient.query({
			...bookStructureQueryOptions({
				chapter: deps.chapter,
				slug: params.bookSlug,
			}),
			staleTime: "static",
		}),
	component: AddVersesRoute,
});

function AddVersesRoute() {
	const { bookSlug } = Route.useParams();
	const { chapter } = Route.useSearch();
	return <AddVersesPage chapter={chapter} slug={bookSlug} />;
}
