import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { NewContentPage } from "@/components/staff/commentary/new-content-page";

export const Route = createFileRoute("/_auth/work/new")({
	beforeLoad: ({ context }) => {
		const keys = context.viewer.permissionKeys;
		if (
			!keys.includes("content.write") &&
			!keys.includes("content.revise") &&
			!keys.includes("sources.manage")
		) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		passage: z.string().max(100).optional().catch(undefined),
	}),
	component: NewContentRoute,
});

function NewContentRoute() {
	const { passage } = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	return (
		<NewContentPage
			initialPassage={passage ?? ""}
			permissionKeys={viewer.permissionKeys}
		/>
	);
}
