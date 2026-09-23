import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { Link } from "@tanstack/react-router";
import { BookmarkIcon } from "lucide-react";

import { communitySavedPreviews } from "./community-fixtures";

export function CommunitySavedPreview() {
	return (
		<section aria-labelledby="community-saved-items-title">
			<Card className="rounded-xl border border-border/70 py-0 shadow-sm">
				<CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
						<BookmarkIcon aria-hidden="true" className="size-4" />
					</div>
					<CardTitle
						className="font-serif text-lg tracking-[-0.02em]"
						id="community-saved-items-title"
					>
						Your Saved Items
					</CardTitle>
					<Link
						className="ml-auto rounded-sm font-medium text-primary text-xs transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						search={{ tab: "bookmarks" }}
						to="/library/saved"
					>
						See all
					</Link>
				</CardHeader>
				<CardContent className="flex flex-col gap-3 px-5 pb-5">
					{communitySavedPreviews.map((item) => (
						<Link
							className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							key={item.id}
							to={item.href}
						>
							{item.image ? (
								<img
									alt=""
									className="size-14 shrink-0 rounded-md object-cover"
									decoding="async"
									loading="lazy"
									src={item.image}
								/>
							) : (
								<div
									aria-hidden="true"
									className="size-14 shrink-0 rounded-md bg-muted"
								/>
							)}
							<div className="min-w-0">
								<h3 className="line-clamp-2 font-serif text-sm leading-4 tracking-[-0.015em] group-hover:text-primary">
									{item.title}
								</h3>
								<p className="mt-1 text-muted-foreground text-xs">
									{item.savedAt}
								</p>
							</div>
						</Link>
					))}
				</CardContent>
			</Card>
		</section>
	);
}
