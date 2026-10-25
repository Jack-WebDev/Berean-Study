import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
	type SavedItemRemoval,
	SavedPage,
	type SavedView,
} from "@/components/saved/saved-page";
import { removeSavedItem } from "@/functions/saved-items";
import { communityKeys, libraryKeys } from "@/queries/keys";
import { savedItemsQueryOptions } from "@/queries/library";

export const Route = createFileRoute("/_auth/library/saved")({
	component: SavedRoute,
	loader: ({ context }) =>
		// "static" returns cached data at once; the page refreshes it if old.
		context.queryClient.query({
			...savedItemsQueryOptions(),
			staleTime: "static",
		}),
	validateSearch: z.object({
		tab: z.enum(["bookmarks", "highlights"]).catch("bookmarks"),
	}),
});

function SavedRoute() {
	const { tab } = Route.useSearch();
	const { data: library } = useSuspenseQuery(savedItemsQueryOptions());
	const navigate = useNavigate({ from: "/library/saved" });
	const queryClient = useQueryClient();
	const removeItem = useMutation({
		mutationFn: async (item: SavedItemRemoval) => {
			const removed = await removeSavedItem({ data: item });
			if (!removed) throw new Error("Unable to remove saved item.");
		},
		onSuccess: (_result, item) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
				item.kind === "community" &&
					queryClient.invalidateQueries({ queryKey: communityKeys.all }),
			]),
	});

	return (
		<SavedPage
			library={library}
			onRemove={removeItem.mutateAsync}
			onViewChange={(nextView: SavedView) =>
				navigate({ to: "/library/saved", search: { tab: nextView } })
			}
			view={tab}
		/>
	);
}
