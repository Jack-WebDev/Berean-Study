import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ReflectionEditorPage } from "@/components/prayer/reflection-editor-page";

export const Route = createFileRoute(
	"/_auth/library/prayers/$prayerId/reflections/$reflectionId/edit",
)({
	component: () => {
		const { prayerId, reflectionId } = Route.useParams();
		return (
			<ReflectionEditorPage prayerId={prayerId} reflectionId={reflectionId} />
		);
	},
	params: {
		parse: (params) =>
			z
				.object({
					prayerId: z.coerce.number().int().positive(),
					reflectionId: z.coerce.number().int().positive(),
				})
				.parse(params),
		stringify: (params) => ({
			prayerId: params.prayerId.toString(),
			reflectionId: params.reflectionId.toString(),
		}),
	},
});
