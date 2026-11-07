import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { ModerationPage } from "@/components/staff/moderation/moderation-page";
import {
	openReportsQueryOptions,
	removedPostsQueryOptions,
	reportedPostQueryOptions,
} from "@/queries/moderation";

export const Route = createFileRoute("/_auth/admin/moderation")({
	beforeLoad: ({ context }) => {
		if (
			!accessibleStaffItem("/admin/moderation", context.viewer.permissionKeys)
		) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		page: z.number().int().positive().optional().catch(undefined),
		post: z.number().int().positive().optional().catch(undefined),
		view: z.literal("removed").optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps }) => {
		const [reports] = await Promise.all([
			queryClient.query({
				...openReportsQueryOptions(),
				staleTime: "static",
			}),
			queryClient.query({
				...removedPostsQueryOptions(deps.page ?? 1),
				staleTime: "static",
			}),
		]);
		const postId = deps.post ?? (deps.view ? undefined : reports[0]?.postId);
		if (postId) {
			await queryClient.query({
				...reportedPostQueryOptions(postId),
				staleTime: "static",
			});
		}
	},
	component: ModerationRoute,
});

function ModerationRoute() {
	const { viewer } = Route.useRouteContext();
	const keys = viewer.permissionKeys;

	return (
		<ModerationPage
			canOpenProfiles={
				keys.includes("contributors.manage") || keys.includes("admins.manage")
			}
			search={Route.useSearch()}
		/>
	);
}
