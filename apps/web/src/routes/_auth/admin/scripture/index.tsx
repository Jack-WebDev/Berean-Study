import { createFileRoute, redirect } from "@tanstack/react-router";

import { BooksPage } from "@/components/staff/scripture/books-page";
import { canReadScriptureData } from "@/components/staff/scripture/scripture-access";
import { scriptureBooksQueryOptions } from "@/queries/scripture-data";

export const Route = createFileRoute("/_auth/admin/scripture/")({
	beforeLoad: ({ context }) => {
		if (!canReadScriptureData(context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(scriptureBooksQueryOptions()),
	component: BooksPage,
});
