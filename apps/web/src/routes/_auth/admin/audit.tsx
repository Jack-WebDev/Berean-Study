import { auditDomains } from "@berean-study/db/audit-catalogue";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { AuditPage } from "@/components/staff/audit/audit-page";
import { auditEntriesQueryOptions } from "@/queries/audit";

export const Route = createFileRoute("/_auth/admin/audit")({
	// The sidebar link is for full access, but Admins can open this for editorial activity.
	beforeLoad: ({ context }) => {
		const keys = context.viewer.permissionKeys;
		if (!keys.includes("audit.view") && !keys.includes("audit.view_all")) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		domain: z.enum(auditDomains).optional().catch(undefined),
		mine: z.boolean().optional().catch(undefined),
		page: z.number().int().positive().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		context.queryClient.query({
			...auditEntriesQueryOptions({
				domain: deps.domain,
				mine: deps.mine,
				page: deps.page ?? 1,
			}),
			staleTime: "static",
		}),
	component: AuditRoute,
});

function AuditRoute() {
	const search = Route.useSearch();
	const { viewer } = Route.useRouteContext();

	return (
		<AuditPage
			canViewAll={viewer.permissionKeys.includes("audit.view_all")}
			search={search}
			viewerId={viewer.session.user.id}
		/>
	);
}
