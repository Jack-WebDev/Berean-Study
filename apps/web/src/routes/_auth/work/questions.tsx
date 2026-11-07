import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import {
	QuestionEditorPage,
	QuestionsListPage,
} from "@/components/staff/study/questions-page";
import {
	studyRecordQueryOptions,
	studyRecordsQueryOptions,
} from "@/queries/study-content";

export const Route = createFileRoute("/_auth/work/questions")({
	beforeLoad: ({ context }) => {
		const keys = context.viewer.permissionKeys;
		if (!keys.includes("content.write") && !keys.includes("content.revise")) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		id: z.string().max(100).optional().catch(undefined),
		new: z.boolean().optional().catch(undefined),
		passage: z.string().max(100).optional().catch(undefined),
		q: z.string().max(200).optional().catch(undefined),
	}),
	loaderDeps: ({ search: { id, q } }) => ({ id, q }),
	loader: async ({ context, deps }) => {
		if (deps.id) {
			await context.queryClient.query({
				...studyRecordQueryOptions({
					kind: "interpretive_question",
					scopeKey: deps.id,
				}),
				staleTime: "static",
			});
			return;
		}
		await context.queryClient.query({
			...studyRecordsQueryOptions({
				kinds: ["interpretive_question"],
				search: deps.q,
			}),
			staleTime: "static",
		});
	},
	component: QuestionsRoute,
});

function QuestionsRoute() {
	const { id, new: isNew, passage, q } = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	if (!id && !isNew) return <QuestionsListPage search={q} />;
	return (
		<QuestionEditorPage
			id={id ?? null}
			initialPassage={passage ?? ""}
			key={id ?? "new"}
			permissionKeys={viewer.permissionKeys}
		/>
	);
}
