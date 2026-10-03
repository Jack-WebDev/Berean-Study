import type { SavedCommunityPost } from "@berean-study/db/community";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { BookmarkIcon } from "lucide-react";

export function CommunitySavedPreview({
	posts,
}: {
	posts: SavedCommunityPost[];
}) {
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
				</CardHeader>
				<CardContent className="flex flex-col gap-3 px-5 pb-5">
					{posts.length === 0 ? (
						<p className="text-muted-foreground text-sm leading-5">
							Items you save from Community will appear here.
						</p>
					) : (
						posts.map((post) => (
							<article
								className="flex min-w-0 items-center gap-3"
								key={post.id}
							>
								{post.coverImage ? (
									<img
										alt=""
										className="size-14 shrink-0 rounded-md object-cover"
										decoding="async"
										loading="lazy"
										src={post.coverImage}
									/>
								) : (
									<div
										aria-hidden="true"
										className="size-14 shrink-0 rounded-md bg-muted"
									/>
								)}
								<div className="min-w-0">
									<h3 className="line-clamp-2 font-serif text-sm leading-4 tracking-[-0.015em]">
										{post.title}
									</h3>
									<p className="mt-1 text-muted-foreground text-xs">
										Saved {post.type}
									</p>
								</div>
							</article>
						))
					)}
				</CardContent>
			</Card>
		</section>
	);
}
