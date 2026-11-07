import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { evidenceSteps } from "@/components/staff/evidence/evidence-display";
import { WorkbenchPage } from "@/components/staff/evidence/workbench-page";
import { evidenceWorkbenchQueryOptions } from "@/queries/evidence";

const recordId = z.number().int().positive().optional().catch(undefined);

export const Route = createFileRoute("/_auth/work/sources/evidence")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/work/sources", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		claim: recordId,
		excerpt: recordId,
		passage: z.string().max(100).optional().catch(undefined),
		source: recordId,
		step: z.enum(evidenceSteps).optional().catch(undefined),
	}),
	loaderDeps: ({ search: { claim, excerpt, source } }) => ({
		claim,
		excerpt,
		source,
	}),
	loader: ({ context, deps }) =>
		context.queryClient.query({
			...evidenceWorkbenchQueryOptions({
				claimId: deps.claim,
				excerptId: deps.excerpt,
				sourceId: deps.source,
			}),
			staleTime: "static",
		}),
	component: WorkbenchRoute,
});

function WorkbenchRoute() {
	const search = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	return (
		<WorkbenchPage
			claimId={search.claim}
			excerptId={search.excerpt}
			passage={search.passage}
			permissionKeys={viewer.permissionKeys}
			sourceId={search.source}
			step={search.step ?? "source"}
		/>
	);
}
