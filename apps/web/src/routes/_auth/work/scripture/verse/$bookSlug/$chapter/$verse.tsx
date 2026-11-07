import { createFileRoute, redirect } from "@tanstack/react-router";

import { canReadVerseText } from "@/components/staff/scripture/scripture-access";
import { VerseTranslationsPage } from "@/components/staff/scripture/verse-translations-page";
import { verseAcrossTranslationsQueryOptions } from "@/queries/verse-text";

const positiveNumber = /^[1-9]\d*$/;

export const Route = createFileRoute(
	"/_auth/work/scripture/verse/$bookSlug/$chapter/$verse",
)({
	beforeLoad: ({ context, params }) => {
		if (!canReadVerseText(context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
		if (
			!positiveNumber.test(params.chapter) ||
			!positiveNumber.test(params.verse)
		) {
			throw redirect({
				params: { bookSlug: params.bookSlug },
				to: "/admin/scripture/$bookSlug/chapters",
			});
		}
	},
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			verseAcrossTranslationsQueryOptions({
				chapter: Number(params.chapter),
				slug: params.bookSlug,
				verse: Number(params.verse),
			}),
		),
	component: VerseRoute,
});

function VerseRoute() {
	const { bookSlug, chapter, verse } = Route.useParams();
	const { viewer } = Route.useRouteContext();

	return (
		<VerseTranslationsPage
			chapter={Number(chapter)}
			permissionKeys={viewer.permissionKeys}
			slug={bookSlug}
			verse={Number(verse)}
		/>
	);
}
