import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PrayerDetailPage } from "@/components/prayer/prayer-detail-page";
export const Route = createFileRoute("/_auth/library/prayers/$prayerId/")({
	component: () => <PrayerDetailPage prayerId={Route.useParams().prayerId} />,
	params: {
		parse: (params) =>
			z.object({ prayerId: z.coerce.number().int().positive() }).parse(params),
		stringify: (params) => ({ prayerId: params.prayerId.toString() }),
	},
});
