import { buttonVariants } from "@berean-study/ui/components/button";
import { DataPagination } from "@berean-study/ui/components/pagination";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { SquarePenIcon } from "lucide-react";

import {
	type CommunityFilter,
	CommunityFilterNavigation,
} from "./community-filter-navigation";
import type { CommunityTopic } from "./community-fixtures";
import {
	CommunityPostCard,
	type CommunityPostCardData,
} from "./community-post-card";
import { CommunityRightRail } from "./community-right-rail";
import { FeaturedCommunityPost } from "./featured-community-post";

export function CommunityPage({
	activeFilter,
	activeTopic,
	onBookmarkChange,
	onFilterChange,
	onPaginationChange,
	onTopicChange,
	page,
	pageSize,
	posts,
	totalPosts,
}: {
	activeFilter: CommunityFilter;
	activeTopic?: string;
	onFilterChange: (filter: CommunityFilter) => void;
	onBookmarkChange: (postId: string, isBookmarked: boolean) => Promise<void>;
	onPaginationChange: (page: number, pageSize: number) => void;
	onTopicChange: (topic?: CommunityTopic) => void;
	page: number;
	pageSize: number;
	posts: CommunityPostCardData[];
	totalPosts: number;
}) {
	const featuredPost =
		page === 1
			? (posts.find((post) => post.type === "testimony") ?? posts[0] ?? null)
			: null;
	const feedPosts = featuredPost
		? posts.filter((post) => post.id !== featuredPost.id)
		: posts;

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
						activeFilter={activeFilter}
						onFilterChange={onFilterChange}
					/>
				</div>

				<div className="mt-4 grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
					<div className="min-w-0">
						{activeFilter === "featured" ? (
							<>
								<div>
									<FeaturedCommunityPost post={featuredPost} />
								</div>

								<section
									aria-labelledby="from-our-community-title"
									className="mt-10 sm:mt-12"
								>
									<header>
										<h2
											className="font-serif text-2xl leading-tight tracking-[-0.03em] sm:text-[1.7rem]"
											id="from-our-community-title"
										>
											From Our Community
										</h2>
										<p className="mt-1 text-muted-foreground text-sm leading-6">
											Real people. Real faith. Encouragement for the journey.
										</p>
									</header>

									<div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
										{feedPosts.map((post) => (
											<CommunityPostCard
												key={post.id}
												onBookmarkChange={onBookmarkChange}
												post={post}
											/>
										))}
									</div>
									<DataPagination
										className="mt-8"
										onPageChange={(nextPage) =>
											onPaginationChange(nextPage, pageSize)
										}
										onPageSizeChange={(nextPageSize) =>
											onPaginationChange(1, nextPageSize)
										}
										page={page}
										pageSize={pageSize}
										pageSizeOptions={[12, 24, 48]}
										total={totalPosts}
									/>
								</section>
							</>
						) : null}
					</div>
					<CommunityRightRail
						activeTopic={activeTopic}
						onTopicChange={onTopicChange}
					/>
				</div>
			</div>
		</main>
	);
}
