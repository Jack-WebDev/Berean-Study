import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { SourcesPage } from "@/components/staff/evidence/sources-page";
import {
	evidenceClaimsQueryOptions,
	evidenceSourcesQueryOptions,
} from "@/queries/evidence";

export const Route = createFileRoute("/_auth/work/sources/")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/work/sources", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		q: z.string().max(200).optional().catch(undefined),
		tab: z.enum(["sources", "claims"]).optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => ({ q: search.q }),
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.query({
				...evidenceSourcesQueryOptions({
					includeInactive: true,
					search: deps.q,
				}),
				staleTime: "static",
			}),
			context.queryClient.query({
				...evidenceClaimsQueryOptions({ search: deps.q }),
				staleTime: "static",
			}),
		]),
	component: SourcesRoute,
});

function SourcesRoute() {
	const { q, tab } = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	return (
		<SourcesPage
			permissionKeys={viewer.permissionKeys}
			search={q}
			tab={tab ?? "sources"}
		/>
	);
}
