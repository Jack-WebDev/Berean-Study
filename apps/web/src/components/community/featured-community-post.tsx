import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@berean-study/ui/components/avatar";
import { buttonVariants } from "@berean-study/ui/components/button";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { formatPublishedAt, initialsFor } from "@/utils";

import type { CommunityPostCardData } from "./community-post-card";

const fallbackCoverImage =
	"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=90";

export function FeaturedCommunityPost({
	post,
}: {
	post: CommunityPostCardData | null;
}) {
	if (!post) return null;

	return (
		<section aria-labelledby="featured-community-post-title">
			<article className="relative isolate overflow-hidden rounded-xl bg-foreground text-white shadow-[0_12px_32px_color-mix(in_oklch,var(--foreground),transparent_82%)]">
				<img
					alt=""
					className="absolute inset-0 -z-30 size-full object-cover"
					src={post.coverImage ?? fallbackCoverImage}
				/>
				<div className="absolute inset-0 -z-20 bg-linear-to-r from-foreground/95 via-foreground/75 to-foreground/20" />
				<div className="absolute inset-0 -z-10 bg-linear-to-t from-foreground/70 via-transparent to-foreground/20" />

				<div className="flex min-h-100 items-end px-6 py-7 sm:px-8 sm:py-8 lg:px-9 lg:py-9">
					<div className="flex max-w-xl flex-col items-start">
						<p className="font-medium text-[11px] text-white/75 uppercase tracking-[0.22em]">
							Featured {post.type}
						</p>
						<h2
							className="mt-3 max-w-lg font-serif text-3xl leading-[1.04] tracking-[-0.035em] sm:text-4xl"
							id="featured-community-post-title"
						>
							{post.title}
						</h2>
						<p className="mt-4 max-w-lg text-sm text-white/80 leading-6 sm:text-base">
							{post.excerpt}
						</p>

						<div className="mt-6 flex items-center gap-3">
							<Avatar>
								<AvatarImage
									alt={post.author.name}
									src={post.author.image ?? undefined}
								/>
								<AvatarFallback>{initialsFor(post.author.name)}</AvatarFallback>
							</Avatar>
							<div className="text-sm leading-5">
								<p className="font-medium">{post.author.name}</p>
								<p className="text-white/70 text-xs">
									{formatPublishedAt(post.publishedAt)}
								</p>
							</div>
						</div>

						<Link
							className={cn(
								buttonVariants({ size: "lg" }),
								"mt-6 h-10 rounded-lg bg-card px-4 text-card-foreground hover:bg-card/90",
							)}
							to={post.href}
						>
							Read {post.type}
							<ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
						</Link>
					</div>
				</div>
			</article>
		</section>
	);
}
