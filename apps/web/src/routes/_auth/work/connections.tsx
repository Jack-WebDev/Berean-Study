import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import {
	ConnectionsPage,
	ConnectionsStartPage,
	connectionTabs,
} from "@/components/staff/study/connections-page";
import {
	connectionRecordQueryOptions,
	passageConnectionsQueryOptions,
	themesQueryOptions,
} from "@/queries/study-content";

export const Route = createFileRoute("/_auth/work/connections")({
	beforeLoad: ({ context }) => {
		const keys = context.viewer.permissionKeys;
		if (!keys.includes("content.write") && !keys.includes("content.revise")) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		edit: z.string().max(200).optional().catch(undefined),
		existed: z.boolean().optional().catch(undefined),
		passage: z.string().max(100).optional().catch(undefined),
		tab: z.enum(connectionTabs).optional().catch(undefined),
	}),
	loaderDeps: ({ search: { edit, passage, tab } }) => ({ edit, passage, tab }),
	loader: async ({ context, deps }) => {
		if (!deps.passage) return;
		const load = { staleTime: "static" } as const;
		await Promise.all([
			context.queryClient.query({
				...passageConnectionsQueryOptions(deps.passage),
				...load,
			}),
			deps.tab === "theme_passage"
				? context.queryClient.query({ ...themesQueryOptions(), ...load })
				: deps.edit
					? context.queryClient.query({
							...connectionRecordQueryOptions({
								kind: deps.tab ?? "cross_reference",
								scopeKey: deps.edit,
							}),
							...load,
						})
					: null,
		]);
	},
	component: ConnectionsRoute,
});

function ConnectionsRoute() {
	const { edit, existed, passage, tab } = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	if (!passage) return <ConnectionsStartPage initialPassage="" />;
	return (
		<ConnectionsPage
			editing={edit}
			existed={existed}
			passage={passage}
			permissionKeys={viewer.permissionKeys}
			tab={tab ?? "cross_reference"}
		/>
	);
}
