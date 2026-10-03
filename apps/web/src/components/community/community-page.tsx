import type {
	CommunityFeedSelection,
	SavedCommunityPost,
} from "@berean-study/db/community";
import { buttonVariants } from "@berean-study/ui/components/button";
import { DataPagination } from "@berean-study/ui/components/pagination";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { SquarePenIcon } from "lucide-react";

import {
	type CommunityFilter,
	CommunityFilterNavigation,
} from "./community-filter-navigation";
import {
	CommunityPostCard,
	type CommunityPostCardData,
} from "./community-post-card";
import { CommunityRightRail } from "./community-right-rail";
import { FeaturedCommunityPost } from "./featured-community-post";

export type CommunityPageFeed = {
	featuredPost: CommunityPostCardData | null;
	posts: CommunityPostCardData[];
	total: number;
};

export function CommunityPage({
	feed,
	onBookmarkChange,
	onFilterChange,
	onPaginationChange,
	savedPosts,
	selection,
}: {
	feed: CommunityPageFeed;
	onFilterChange: (filter: CommunityFilter) => void;
	onBookmarkChange: (postId: string, isBookmarked: boolean) => Promise<void>;
	onPaginationChange: (page: number, pageSize: number) => void;
	savedPosts: SavedCommunityPost[];
	selection: CommunityFeedSelection;
}) {
	const isFeaturedView = selection.view === "featured";
	const hasVisiblePosts = feed.featuredPost !== null || feed.posts.length > 0;

	return (
		<main className="min-h-full bg-background text-foreground">
			<div className="mx-auto w-full max-w-360 px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
				<header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
					<div className="max-w-3xl">
						<h1 className="font-serif text-4xl leading-none tracking-[-0.045em] sm:text-5xl lg:text-[3.5rem]">
							Community
						</h1>
						<p className="mt-4 max-w-2xl text-base text-muted-foreground leading-7 sm:text-[1.0625rem]">
							Discover and share Christ-centered notes, collections,
							testimonies, and prayers with a community of believers.
						</p>
					</div>

					<Link
						className={cn(
							buttonVariants({ size: "lg" }),
							"h-11 self-start rounded-lg px-4 text-sm shadow-sm",
						)}
						to="/community/share"
					>
						<SquarePenIcon aria-hidden="true" data-icon="inline-start" />
						Share with Community
					</Link>
				</header>

				<div className="mt-10 sm:mt-12">
					<CommunityFilterNavigation
						activeFilter={selection.view}
						onFilterChange={onFilterChange}
					/>
				</div>

				<div className="mt-4 grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
					<div className="min-w-0">
						{isFeaturedView ? (
							<div>
								<FeaturedCommunityPost post={feed.featuredPost} />
							</div>
						) : null}

						<section
							aria-labelledby="from-our-community-title"
							className={isFeaturedView ? "mt-10 sm:mt-12" : undefined}
						>
							<header>
								<h2
									className="font-serif text-2xl leading-tight tracking-[-0.03em] sm:text-[1.7rem]"
									id="from-our-community-title"
								>
									{feedHeading(selection.view)}
								</h2>
								<p className="mt-1 text-muted-foreground text-sm leading-6">
									{feedDescription(selection.view)}
								</p>
							</header>

							{feed.posts.length > 0 ? (
								<div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
									{feed.posts.map((post) => (
										<CommunityPostCard
											key={post.id}
											onBookmarkChange={onBookmarkChange}
											post={post}
										/>
									))}
								</div>
							) : hasVisiblePosts ? null : (
								<p className="mt-6 text-muted-foreground text-sm">
									No {feedNoun(selection.view)} have been shared yet.
								</p>
							)}
							<DataPagination
								className="mt-8"
								onPageChange={(nextPage) =>
									onPaginationChange(nextPage, selection.pageSize)
								}
								onPageSizeChange={(nextPageSize) =>
									onPaginationChange(1, nextPageSize)
								}
								page={selection.page}
								pageSize={selection.pageSize}
								pageSizeOptions={[12, 24, 48]}
								total={feed.total}
							/>
						</section>
					</div>
					<CommunityRightRail savedPosts={savedPosts} />
				</div>
			</div>
		</main>
	);
}

function feedHeading(filter: CommunityFilter) {
	switch (filter) {
		case "featured":
			return "From Our Community";
		case "recent":
			return "Recent from Community";
		case "collection":
			return "Community Collections";
		case "note":
			return "Community Notes";
		case "testimony":
			return "Community Testimonies";
		case "prayer":
			return "Community Prayers";
	}
}

function feedDescription(filter: CommunityFilter) {
	return filter === "featured"
		? "Real people. Real faith. Encouragement for the journey."
		: `Recently shared ${feedNoun(filter)} from the Community.`;
}

function feedNoun(filter: CommunityFilter) {
	return filter === "featured" || filter === "recent" ? "posts" : `${filter}s`;
}
