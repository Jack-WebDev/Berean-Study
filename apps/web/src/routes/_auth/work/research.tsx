import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { ResearchPage } from "@/components/staff/research/research-page";
import {
	evidenceSourcesQueryOptions,
	researchNotesQueryOptions,
} from "@/queries/evidence";

export const Route = createFileRoute("/_auth/work/research")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/work/research", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		q: z.string().max(200).optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => ({ q: search.q }),
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.query({
				...researchNotesQueryOptions({ search: deps.q }),
				staleTime: "static",
			}),
			context.queryClient.query({
				...evidenceSourcesQueryOptions({}),
				staleTime: "static",
			}),
		]),
	component: ResearchRoute,
});

function ResearchRoute() {
	const { viewer } = Route.useRouteContext();
	return (
		<ResearchPage
			search={Route.useSearch().q}
			viewerUserId={viewer.session.user.id}
		/>
	);
}
