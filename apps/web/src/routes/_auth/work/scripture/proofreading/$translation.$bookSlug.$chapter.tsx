import { createFileRoute, redirect } from "@tanstack/react-router";

import { ProofreadingPage } from "@/components/staff/scripture/proofreading/proofreading-page";
import { proofreadingChapterQueryOptions } from "@/queries/verse-text";

export const Route = createFileRoute(
	"/_auth/work/scripture/proofreading/$translation/$bookSlug/$chapter",
)({
	beforeLoad: ({ context, params }) => {
		const keys = context.viewer.permissionKeys;
		if (
			!keys.includes("scripture.proofread") &&
			!keys.includes("publication.publish")
		) {
			throw redirect({ to: "/home" });
		}
		if (!/^[1-9]\d*$/.test(params.chapter)) {
			throw redirect({ to: "/work/scripture/proofreading" });
		}
	},
	loader: ({ context, params }) =>
		context.queryClient.query({
			...proofreadingChapterQueryOptions({
				abbreviation: params.translation,
				chapter: Number(params.chapter),
				slug: params.bookSlug,
			}),
			staleTime: "static",
		}),
	component: ProofreadingRoute,
});

function ProofreadingRoute() {
	const { bookSlug, chapter, translation } = Route.useParams();
	const { viewer } = Route.useRouteContext();

	return (
		<ProofreadingPage
			address={{
				abbreviation: translation,
				chapter: Number(chapter),
				slug: bookSlug,
			}}
			permissionKeys={viewer.permissionKeys}
		/>
	);
}
