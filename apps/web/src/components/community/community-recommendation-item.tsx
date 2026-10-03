import { Link } from "@tanstack/react-router";

import type { CommunityRecommendation } from "./community-fixtures";

export function CommunityRecommendationItem({
	recommendation,
}: {
	recommendation: CommunityRecommendation;
}) {
	return (
		<Link
			className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			to={recommendation.href}
		>
			{recommendation.image ? (
				<img
					alt=""
					className="size-14 shrink-0 rounded-md object-cover"
					decoding="async"
					loading="lazy"
					src={recommendation.image}
				/>
			) : (
				<div
					aria-hidden="true"
					className="size-14 shrink-0 rounded-md bg-muted"
				/>
			)}
			<div className="min-w-0">
				<h3 className="line-clamp-2 font-serif text-sm leading-4 tracking-[-0.015em] group-hover:text-primary">
					{recommendation.title}
				</h3>
				<p className="mt-1 font-medium text-[9px] text-muted-foreground uppercase tracking-[0.16em]">
					{recommendation.type}
				</p>
				<p className="mt-0.5 truncate text-muted-foreground text-xs">
					{recommendation.metadata}
				</p>
			</div>
		</Link>
	);
}
