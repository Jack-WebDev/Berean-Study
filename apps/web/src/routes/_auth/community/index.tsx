import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import type { CommunityFilter } from "@/components/community/community-filter-navigation";
import { CommunityPage } from "@/components/community/community-page";
import {
	getCommunityFeed,
	setCommunityPostBookmark,
} from "@/functions/community";

export const Route = createFileRoute("/_auth/community/")({
	component: CommunityRoute,
	loader: () => getCommunityFeed(),
	validateSearch: z.object({
		topic: z.string().optional(),
		type: z.enum(["collection", "note", "testimony", "prayer"]).optional(),
		view: z.enum(["featured", "recent"]).optional(),
	}),
});

function CommunityRoute() {
	const { topic, type, view } = Route.useSearch();
	const posts = Route.useLoaderData().map((post) => ({
		author: post.author,
		coverImage: post.coverImage,
		excerpt: post.excerpt,
		href: "/community",
		id: String(post.id),
		isBookmarked: post.isBookmarked,
		publishedAt: post.publishedAt,
		title: post.title,
		type: post.type,
	}));
	const navigate = useNavigate({ from: "/community/" });
	const activeFilter: CommunityFilter = type ?? view ?? "featured";

	return (
		<CommunityPage
			activeFilter={activeFilter}
			activeTopic={topic}
			onBookmarkChange={async (postId, isBookmarked) => {
				const updated = await setCommunityPostBookmark({
					data: { isBookmarked, postId: Number(postId) },
				});
				if (!updated) throw new Error("Unable to update bookmark.");
			}}
			onFilterChange={(filter) =>
				navigate({
					to: ".",
					search:
						filter === "featured"
							? { topic }
							: filter === "recent"
								? { topic, view: filter }
								: { topic, type: filter },
				})
			}
			onTopicChange={(nextTopic) =>
				navigate({
					to: ".",
					search: type
						? { topic: nextTopic, type }
						: { topic: nextTopic, view },
				})
			}
			posts={posts}
		/>
	);
}
