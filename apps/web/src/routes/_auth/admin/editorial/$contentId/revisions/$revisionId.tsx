import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import {
	RevisionPage,
	revisionTabs,
} from "@/components/staff/content/revision-page";
import { revisionPageQueryOptions } from "@/queries/content";

const positiveNumber = /^[1-9]\d*$/;

export const Route = createFileRoute(
	"/_auth/admin/editorial/$contentId/revisions/$revisionId",
)({
	beforeLoad: ({ context, params }) => {
		const keys = context.viewer.permissionKeys;
		const canOpen = [
			"content.write",
			"content.revise",
			"editorial.check",
			"editorial.review",
			"editorial.assign",
			"publication.publish",
			"publication.withdraw",
			"issues.manage",
		] as const;
		if (!canOpen.some((key) => keys.includes(key))) {
			throw redirect({ to: "/home" });
		}
		if (
			!positiveNumber.test(params.contentId) ||
			!positiveNumber.test(params.revisionId)
		) {
			throw redirect({ to: "/work" });
		}
	},
	validateSearch: z.object({
		tab: z.enum(revisionTabs).optional().catch(undefined),
	}),
	loader: ({ context, params }) =>
		context.queryClient.query({
			...revisionPageQueryOptions({
				contentItemId: Number(params.contentId),
				revisionId: Number(params.revisionId),
			}),
			staleTime: "static",
		}),
	component: RevisionRoute,
});

function RevisionRoute() {
	const { contentId, revisionId } = Route.useParams();
	const { tab } = Route.useSearch();
	const { viewer } = Route.useRouteContext();

	return (
		<RevisionPage
			contentItemId={Number(contentId)}
			permissionKeys={viewer.permissionKeys}
			revisionId={Number(revisionId)}
			tab={tab ?? "changes"}
		/>
	);
}
