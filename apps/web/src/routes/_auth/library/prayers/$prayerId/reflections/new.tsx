import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ReflectionEditorPage } from "@/components/prayer/reflection-editor-page";

export const Route = createFileRoute(
	"/_auth/library/prayers/$prayerId/reflections/new",
)({
	component: () => (
		<ReflectionEditorPage prayerId={Route.useParams().prayerId} />
	),
	params: {
		parse: (params) =>
			z.object({ prayerId: z.coerce.number().int().positive() }).parse(params),
		stringify: (params) => ({ prayerId: params.prayerId.toString() }),
	},
});
