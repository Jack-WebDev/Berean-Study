import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { VerseHandlingPage } from "@/components/staff/foundations/verse-handling-page";
import { verseHandlingQueryOptions } from "@/queries/foundations";

export const Route = createFileRoute(
	"/_auth/admin/scripture/$bookSlug/verse-handling",
)({
	beforeLoad: ({ context, params, search }) => {
		if (!context.viewer.permissionKeys.includes("scripture.manage")) {
			throw redirect({ to: "/home" });
		}
		if (!search.chapter || !search.verse) {
			throw redirect({
				params: { bookSlug: params.bookSlug },
				to: "/admin/scripture/$bookSlug/chapters",
			});
		}
	},
	validateSearch: z.object({
		chapter: z.number().int().positive().optional().catch(undefined),
		verse: z.number().int().positive().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps, params }) => {
		if (!deps.chapter || !deps.verse) return;
		return context.queryClient.ensureQueryData(
			verseHandlingQueryOptions({
				chapter: deps.chapter,
				slug: params.bookSlug,
				verse: deps.verse,
			}),
		);
	},
	component: VerseHandlingRoute,
});

function VerseHandlingRoute() {
	const { bookSlug } = Route.useParams();
	const { chapter, verse } = Route.useSearch();
	if (!chapter || !verse) return null;
	return <VerseHandlingPage chapter={chapter} slug={bookSlug} verse={verse} />;
}
