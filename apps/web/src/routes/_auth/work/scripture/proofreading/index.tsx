import { createFileRoute, redirect } from "@tanstack/react-router";

import { ProofreadingQueuePage } from "@/components/staff/scripture/proofreading/proofreading-queue-page";
import {
	proofreadingQueueQueryOptions,
	readyToPublishQueryOptions,
} from "@/queries/verse-text";

export const Route = createFileRoute("/_auth/work/scripture/proofreading/")({
	beforeLoad: ({ context }) => {
		const keys = context.viewer.permissionKeys;
		if (
			!keys.includes("scripture.enter") &&
			!keys.includes("scripture.proofread")
		) {
			throw redirect({ to: "/home" });
		}
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(proofreadingQueueQueryOptions());
		if (context.viewer.permissionKeys.includes("publication.publish")) {
			await context.queryClient.ensureQueryData(readyToPublishQueryOptions());
		}
	},
	component: ProofreadingQueueRoute,
});

function ProofreadingQueueRoute() {
	const { viewer } = Route.useRouteContext();
	return <ProofreadingQueuePage permissionKeys={viewer.permissionKeys} />;
}
