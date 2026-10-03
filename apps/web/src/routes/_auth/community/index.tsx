import type {
	CommunityFeedPage,
	CommunityFeedPost,
	CommunityFeedSelection,
	CommunityFeedView,
} from "@berean-study/db/community";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import {
	CommunityPage,
	type CommunityPageFeed,
} from "@/components/community/community-page";
import type { CommunityPostCardData } from "@/components/community/community-post-card";
import {
	getCommunityFeed,
	listSavedCommunityPosts,
	setCommunityPostBookmark,
} from "@/functions/community";

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
	loader: async ({ deps }) => {
		const [feed, savedPosts] = await Promise.all([
			getCommunityFeed({ data: deps }),
			listSavedCommunityPosts({ data: { limit: 2 } }),
		]);
		return { feed, savedPosts };
	},
	validateSearch: communitySearchSchema,
});

function CommunityRoute() {
	const { page, pageSize, view } = Route.useSearch();
	const { feed: loadedFeed, savedPosts } = Route.useLoaderData();
	const feed = toPageFeed(loadedFeed);
	const navigate = useNavigate({ from: "/community/" });
	const router = useRouter();
	const selection: CommunityFeedSelection = { page, pageSize, view };
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
			onBookmarkChange={async (postId, isBookmarked) => {
				const updated = await setCommunityPostBookmark({
					data: { isBookmarked, postId: Number(postId) },
				});
				if (!updated) throw new Error("Unable to update bookmark.");
				await router.invalidate();
			}}
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
