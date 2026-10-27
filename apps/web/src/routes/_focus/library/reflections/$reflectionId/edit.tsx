import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ReflectionEditorPage } from "@/components/journal/reflection-editor-page";

export const Route = createFileRoute(
	"/_focus/library/reflections/$reflectionId/edit",
)({
	component: () => (
		<ReflectionEditorPage reflectionId={Route.useParams().reflectionId} />
	),
	params: {
		parse: (params) =>
			z
				.object({ reflectionId: z.coerce.number().int().positive() })
				.parse(params),
		stringify: (params) => ({ reflectionId: params.reflectionId.toString() }),
	},
});
