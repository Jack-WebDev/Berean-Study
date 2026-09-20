import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { EditTestimonyPage } from "@/components/testimony/edit-testimony-page";
export const Route = createFileRoute(
	"/_auth/library/testimonials/$testimonyId/edit",
)({
	component: () => (
		<EditTestimonyPage testimonyId={Route.useParams().testimonyId} />
	),
	params: {
		parse: (params) =>
			z
				.object({ testimonyId: z.coerce.number().int().positive() })
				.parse(params),
		stringify: (params) => ({ testimonyId: params.testimonyId.toString() }),
	},
});
