import type {
	CommunityFeedPage,
	CommunityFeedPost,
	CommunityFeedSelection,
	CommunityFeedView,
} from "@berean-study/db/community";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
	CommunityPage,
	type CommunityPageFeed,
} from "@/components/community/community-page";
import type { CommunityPostCardData } from "@/components/community/community-post-card";
import { setCommunityPostBookmark } from "@/functions/community";
import {
	communityFeedQueryOptions,
	savedCommunityPostsQueryOptions,
} from "@/queries/community";
import { communityKeys, libraryKeys } from "@/queries/keys";

const savedPostsLimit = 2;

const communitySearchSchema = z
	.object({
		page: z.coerce.number().int().positive().default(1),
		pageSize: z.coerce.number().int().min(1).max(50).default(12),
		type: z.enum(["collection", "note", "testimony", "prayer"]).optional(),
		view: z
			.enum(["featured", "recent", "collection", "note", "testimony", "prayer"])
			.optional(),
	})
	.transform(({ type, view, ...selection }) => ({
		...selection,
		view: type ?? view ?? "featured",
	}));

export const Route = createFileRoute("/_auth/community/")({
	component: CommunityRoute,
	loaderDeps: ({ search }) => search,
	// "static" returns cached data at once; the page refreshes it if old.
	loader: ({ context: { queryClient }, deps }) =>
		Promise.all([
			queryClient.query({
				...communityFeedQueryOptions(deps),
				staleTime: "static",
			}),
			queryClient.query({
				...savedCommunityPostsQueryOptions(savedPostsLimit),
				staleTime: "static",
			}),
		]),
	validateSearch: communitySearchSchema,
});

function CommunityRoute() {
	const { page, pageSize, view } = Route.useSearch();
	const selection: CommunityFeedSelection = { page, pageSize, view };
	const { data: feed } = useSuspenseQuery({
		...communityFeedQueryOptions(selection),
		select: toPageFeed,
	});
	const { data: savedPosts } = useSuspenseQuery(
		savedCommunityPostsQueryOptions(savedPostsLimit),
	);
	const navigate = useNavigate({ from: "/community/" });
	const queryClient = useQueryClient();
	const setBookmark = useMutation({
		mutationFn: async (input: { isBookmarked: boolean; postId: number }) => {
			const updated = await setCommunityPostBookmark({ data: input });
			if (!updated) throw new Error("Unable to update bookmark.");
		},
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: communityKeys.all }),
				queryClient.invalidateQueries({ queryKey: libraryKeys.savedItems() }),
			]),
	});
	const searchForView = (nextView: CommunityFeedView) => ({
		page: 1,
		pageSize,
		view: nextView,
	});

	return (
		<CommunityPage
			feed={feed}
			savedPosts={savedPosts}
			selection={selection}
			onBookmarkChange={(postId, isBookmarked) =>
				setBookmark.mutateAsync({ isBookmarked, postId: Number(postId) })
			}
			onFilterChange={(nextView) =>
				navigate({
					to: ".",
					search: searchForView(nextView),
				})
			}
			onPaginationChange={(nextPage, nextPageSize) =>
				navigate({
					to: ".",
					search: { page: nextPage, pageSize: nextPageSize, view },
				})
			}
		/>
	);
}

function toPageFeed(feed: CommunityFeedPage): CommunityPageFeed {
	return {
		featuredPost: feed.featuredPost ? toCardData(feed.featuredPost) : null,
		posts: feed.posts.map(toCardData),
		total: feed.total,
	};
}

function toCardData(post: CommunityFeedPost): CommunityPostCardData {
	return {
		author: post.author,
		coverImage: post.coverImage,
		excerpt: post.excerpt,
		href: "/community",
		id: String(post.id),
		isBookmarked: post.isBookmarked,
		publishedAt: post.publishedAt,
		title: post.title,
		type: post.type,
	};
}
