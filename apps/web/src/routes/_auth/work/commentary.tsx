import { commentaryKinds } from "@berean-study/db/commentary-body";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { CommentaryEditorPage } from "@/components/staff/commentary/commentary-editor-page";
import { CommentaryStartPage } from "@/components/staff/commentary/commentary-start-page";
import {
	bookResearchQueryOptions,
	commentaryEditorQueryOptions,
	commentaryListQueryOptions,
} from "@/queries/commentary";

export const Route = createFileRoute("/_auth/work/commentary")({
	beforeLoad: ({ context }) => {
		const keys = context.viewer.permissionKeys;
		if (!keys.includes("content.write") && !keys.includes("content.revise")) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		kind: z.enum(commentaryKinds).optional().catch(undefined),
		passage: z.string().max(100).optional().catch(undefined),
		q: z.string().max(200).optional().catch(undefined),
		scope: z.string().max(100).optional().catch(undefined),
	}),
	loaderDeps: ({ search: { kind, q, scope } }) => ({ kind, q, scope }),
	loader: async ({ context, deps }) => {
		if (deps.kind && deps.scope) {
			const editor = await context.queryClient.query({
				...commentaryEditorQueryOptions({
					kind: deps.kind,
					scopeKey: deps.scope,
				}),
				staleTime: "static",
			});
			if (editor) {
				await context.queryClient.query({
					...bookResearchQueryOptions(editor.scope.bookSlug),
					staleTime: "static",
				});
			}
			return;
		}
		await context.queryClient.query({
			...commentaryListQueryOptions({ search: deps.q }),
			staleTime: "static",
		});
	},
	component: CommentaryRoute,
});

function CommentaryRoute() {
	const { kind, passage, q, scope } = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	return kind && scope ? (
		<CommentaryEditorPage
			kind={kind}
			key={`${kind}:${scope}`}
			permissionKeys={viewer.permissionKeys}
			scopeKey={scope}
		/>
	) : (
		<CommentaryStartPage
			initialKind={kind ?? "passage_commentary"}
			initialPassage={passage ?? ""}
			search={q}
		/>
	);
}
