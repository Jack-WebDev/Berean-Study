import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PrayerEditorPage } from "@/components/journal/prayer-editor-page";

export const Route = createFileRoute("/_focus/library/prayers/$prayerId/edit")({
	component: () => <PrayerEditorPage prayerId={Route.useParams().prayerId} />,
	params: {
		parse: (params) =>
			z.object({ prayerId: z.coerce.number().int().positive() }).parse(params),
		stringify: (params) => ({ prayerId: params.prayerId.toString() }),
	},
});
