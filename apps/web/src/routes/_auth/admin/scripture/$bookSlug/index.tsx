import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { BookPage, bookTabs } from "@/components/staff/scripture/book-page";
import { canReadScriptureData } from "@/components/staff/scripture/scripture-access";
import { contentStateQueryOptions } from "@/queries/content";
import { scriptureBookQueryOptions } from "@/queries/scripture-data";

export const Route = createFileRoute("/_auth/admin/scripture/$bookSlug/")({
	beforeLoad: ({ context }) => {
		if (!canReadScriptureData(context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		tab: z.enum(bookTabs).optional().catch(undefined),
	}),
	loader: async ({ context, params }) => {
		const book = await context.queryClient.ensureQueryData(
			scriptureBookQueryOptions(params.bookSlug),
		);
		if (book) {
			await context.queryClient.ensureQueryData(
				contentStateQueryOptions({
					kind: "book_overview",
					scopeKey: params.bookSlug,
				}),
			);
		}
	},
	component: BookRoute,
});

function BookRoute() {
	const { bookSlug } = Route.useParams();
	const { tab } = Route.useSearch();
	const { viewer } = Route.useRouteContext();

	return (
		<BookPage
			permissionKeys={viewer.permissionKeys}
			slug={bookSlug}
			tab={tab ?? "overview"}
		/>
	);
}
