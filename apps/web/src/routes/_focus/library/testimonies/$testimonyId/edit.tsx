import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { TestimonyEditorPage } from "@/components/journal/testimony-editor-page";

export const Route = createFileRoute(
	"/_focus/library/testimonies/$testimonyId/edit",
)({
	component: () => (
		<TestimonyEditorPage testimonyId={Route.useParams().testimonyId} />
	),
	params: {
		parse: (params) =>
			z
				.object({ testimonyId: z.coerce.number().int().positive() })
				.parse(params),
		stringify: (params) => ({ testimonyId: params.testimonyId.toString() }),
	},
});
