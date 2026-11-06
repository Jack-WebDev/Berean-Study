import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { TranslationsPage } from "@/components/staff/scripture/translations-page";
import { translationsOverviewQueryOptions } from "@/queries/scripture-data";

export const Route = createFileRoute("/_auth/admin/translations")({
	beforeLoad: ({ context }) => {
		if (
			!accessibleStaffItem("/admin/translations", context.viewer.permissionKeys)
		) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		t: z.string().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			translationsOverviewQueryOptions(deps.t),
		),
	component: TranslationsRoute,
});

function TranslationsRoute() {
	const { t } = Route.useSearch();
	return <TranslationsPage abbreviation={t} />;
}
