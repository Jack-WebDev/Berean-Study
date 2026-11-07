import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { CanonPage } from "@/components/staff/foundations/canon-page";
import {
	canonOverviewQueryOptions,
	structureChangesQueryOptions,
} from "@/queries/foundations";

export const Route = createFileRoute("/_auth/admin/canon")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/admin/canon", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		canon: z.string().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.query({
				...canonOverviewQueryOptions(deps.canon),
				staleTime: "static",
			}),
			context.queryClient.query({
				...structureChangesQueryOptions(),
				staleTime: "static",
			}),
		]),
	component: CanonRoute,
});

function CanonRoute() {
	const { canon } = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	return <CanonPage canon={canon} permissionKeys={viewer.permissionKeys} />;
}
