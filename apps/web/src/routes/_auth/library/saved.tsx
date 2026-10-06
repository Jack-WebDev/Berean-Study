import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import {
	type SavedItemRemoval,
	SavedPage,
	type SavedView,
} from "@/components/saved/saved-page";
import { getSavedItems, removeSavedItem } from "@/functions/saved-items";

export const Route = createFileRoute("/_auth/library/saved")({
	component: SavedRoute,
	loader: () => getSavedItems(),
	validateSearch: z.object({
		tab: z.enum(["bookmarks", "highlights"]).catch("bookmarks"),
	}),
});

function SavedRoute() {
	const { tab } = Route.useSearch();
	const library = Route.useLoaderData();
	const navigate = useNavigate({ from: "/library/saved" });
	const router = useRouter();

	return (
		<SavedPage
			library={library}
			onRemove={async (item: SavedItemRemoval) => {
				const removed = await removeSavedItem({ data: item });
				if (!removed) throw new Error("Unable to remove saved item.");
				await router.invalidate();
			}}
			onViewChange={(nextView: SavedView) =>
				navigate({ to: "/library/saved", search: { tab: nextView } })
			}
			view={tab}
		/>
	);
}
