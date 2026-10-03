import type { SavedCommunityPost } from "@berean-study/db/community";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, CompassIcon, UsersRoundIcon } from "lucide-react";

import { communityRecommendations } from "./community-fixtures";
import { CommunityRecommendationItem } from "./community-recommendation-item";
import { CommunitySavedPreview } from "./community-saved-preview";

export function CommunityRightRail({
	savedPosts,
}: {
	savedPosts: SavedCommunityPost[];
}) {
	return (
		<aside aria-label="Community resources" className="flex flex-col gap-4">
			<CommunityGuidelinesCard />
			<CommunityRecommendations />
			<CommunitySavedPreview posts={savedPosts} />
		</aside>
	);
}

function CommunityRecommendations() {
	return (
		<section aria-labelledby="community-recommendations-title">
			<Card className="rounded-xl border border-border/70 py-0 shadow-sm">
				<CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
						<CompassIcon aria-hidden="true" className="size-4" />
					</div>
					<CardTitle
						className="font-serif text-lg tracking-[-0.02em]"
						id="community-recommendations-title"
					>
						Recommended to Explore
					</CardTitle>
					<Link
						className="ml-auto rounded-sm font-medium text-primary text-xs transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						to="/community"
					>
						See all
					</Link>
				</CardHeader>
				<CardContent className="flex flex-col gap-3 px-5 pb-5">
					{communityRecommendations.map((recommendation) => (
						<CommunityRecommendationItem
							key={recommendation.id}
							recommendation={recommendation}
						/>
					))}
				</CardContent>
			</Card>
		</section>
	);
}

function CommunityGuidelinesCard() {
	return (
		<Card className="rounded-xl border border-border/70 py-0 shadow-sm">
			<CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-2">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
					<UsersRoundIcon aria-hidden="true" className="size-4" />
				</div>
				<CardTitle className="font-serif text-lg tracking-[-0.02em]">
					Community Guidelines
				</CardTitle>
			</CardHeader>
			<CardContent className="px-5 pb-5">
				<CardDescription className="text-sm leading-5">
					A Christ-centered space for encouragement, thoughtful discussion, and
					sharing what God is teaching us.
				</CardDescription>
				<Link
					className="mt-4 inline-flex items-center gap-1 rounded-sm font-medium text-primary text-xs transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					to="/community/guidelines"
				>
					Read our guidelines
					<ArrowRightIcon aria-hidden="true" className="size-3.5" />
				</Link>
			</CardContent>
		</Card>
	);
}
