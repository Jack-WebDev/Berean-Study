import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { EditPrayerPage } from "@/components/prayer/edit-prayer-page";
export const Route = createFileRoute("/_auth/library/prayers/$prayerId/edit")({
	component: () => <EditPrayerPage prayerId={Route.useParams().prayerId} />,
	params: {
		parse: (params) =>
			z.object({ prayerId: z.coerce.number().int().positive() }).parse(params),
		stringify: (params) => ({ prayerId: params.prayerId.toString() }),
	},
});
