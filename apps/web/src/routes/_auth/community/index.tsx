import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import type { CommunityFilter } from "@/components/community/community-filter-navigation";
import { CommunityPage } from "@/components/community/community-page";
import type { CommunityPostCardData } from "@/components/community/community-post-card";
import {
	getCommunityFeed,
	setCommunityPostBookmark,
} from "@/functions/community";

const communitySearchSchema = z
	.object({
		page: z.coerce.number().int().positive().default(1),
		pageSize: z.coerce.number().int().min(1).max(50).default(12),
		topic: z.string().trim().min(1).max(100).optional(),
		type: z.enum(["collection", "note", "testimony", "prayer"]).optional(),
		view: z.enum(["featured", "recent"]).default("featured"),
	})
	.transform(({ type, view, ...search }) => ({
		...search,
		type,
		view: type ? undefined : view,
	}));

export const Route = createFileRoute("/_auth/community/")({
	component: CommunityRoute,
	loaderDeps: ({ search }) => ({
		filter: search.type ?? search.view ?? "featured",
		page: search.page,
		pageSize: search.pageSize,
	}),
	loader: ({ deps }) => getCommunityFeed({ data: deps }),
	validateSearch: communitySearchSchema,
});

function CommunityRoute() {
	const { page, pageSize, topic, type, view } = Route.useSearch();
	const feed = Route.useLoaderData();
	const posts = feed.posts.map(toCardData);
	const navigate = useNavigate({ from: "/community/" });
	const activeFilter: CommunityFilter = type ?? view ?? "featured";
	const searchForFilter = (filter: CommunityFilter, nextTopic = topic) =>
		filter === "featured" || filter === "recent"
			? { page: 1, pageSize, topic: nextTopic, view: filter }
			: { page: 1, pageSize, topic: nextTopic, type: filter };

	return (
		<CommunityPage
			activeFilter={activeFilter}
			activeTopic={topic}
			page={page}
			pageSize={pageSize}
			onBookmarkChange={async (postId, isBookmarked) => {
				const updated = await setCommunityPostBookmark({
					data: { isBookmarked, postId: Number(postId) },
				});
				if (!updated) throw new Error("Unable to update bookmark.");
			}}
			onFilterChange={(filter) =>
				navigate({
					to: ".",
					search: searchForFilter(filter),
				})
			}
			onTopicChange={(nextTopic) =>
				navigate({
					to: ".",
					search: searchForFilter(activeFilter, nextTopic),
				})
			}
			onPaginationChange={(nextPage, nextPageSize) =>
				navigate({
					to: ".",
					search:
						activeFilter === "featured" || activeFilter === "recent"
							? {
									page: nextPage,
									pageSize: nextPageSize,
									topic,
									view: activeFilter,
								}
							: {
									page: nextPage,
									pageSize: nextPageSize,
									topic,
									type: activeFilter,
								},
				})
			}
			posts={posts}
			totalPosts={feed.total}
		/>
	);
}

function toCardData(
	post: (typeof Route.types.loaderData.posts)[number],
): CommunityPostCardData {
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
