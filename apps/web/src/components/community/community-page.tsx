import { buttonVariants } from "@berean-study/ui/components/button";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { SquarePenIcon } from "lucide-react";

import {
	type CommunityFilter,
	CommunityFilterNavigation,
} from "./community-filter-navigation";
import { FeaturedCommunityPost } from "./featured-community-post";

export function CommunityPage({
	activeFilter,
	onFilterChange,
}: {
	activeFilter: CommunityFilter;
	onFilterChange: (filter: CommunityFilter) => void;
}) {
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

				{activeFilter === "featured" && (
					<div className="mt-4 max-w-5xl">
						<FeaturedCommunityPost />
					</div>
				)}
			</div>
		</main>
	);
}
