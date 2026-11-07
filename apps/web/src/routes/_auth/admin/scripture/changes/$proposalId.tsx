import { createFileRoute, redirect } from "@tanstack/react-router";

import { StructureChangePage } from "@/components/staff/foundations/structure-change-page";
import { structureChangeQueryOptions } from "@/queries/foundations";

export const Route = createFileRoute(
	"/_auth/admin/scripture/changes/$proposalId",
)({
	beforeLoad: ({ context, params }) => {
		if (!context.viewer.permissionKeys.includes("scripture.manage")) {
			throw redirect({ to: "/home" });
		}
		if (!/^[1-9]\d*$/.test(params.proposalId)) {
			throw redirect({ to: "/admin/canon" });
		}
	},
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			structureChangeQueryOptions(Number(params.proposalId)),
		),
	component: StructureChangeRoute,
});

function StructureChangeRoute() {
	const { proposalId } = Route.useParams();
	return <StructureChangePage proposalId={Number(proposalId)} />;
}
