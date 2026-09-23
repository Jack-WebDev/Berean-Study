import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@berean-study/ui/components/avatar";
import { buttonVariants } from "@berean-study/ui/components/button";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

const featuredTestimony = {
	author: {
		image:
			"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80",
		initials: "SM",
		name: "Sarah Mitchell",
	},
	excerpt:
		"How God's Word anchored my heart during a season of unanswered questions, and what I learned about trusting His timing.",
	image:
		"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=90",
	publishedAt: "2 days ago",
	scripture: {
		reference: "Isaiah 26:3",
		text: "You keep him in perfect peace whose mind is stayed on you, because he trusts in you.",
	},
	title: "Finding Peace in Life's Uncertainty",
} as const;

export function FeaturedCommunityPost() {
	return (
		<section aria-labelledby="featured-community-post-title">
			<article className="relative isolate overflow-hidden rounded-xl bg-foreground text-white shadow-[0_12px_32px_color-mix(in_oklch,var(--foreground),transparent_82%)]">
				<img
					alt=""
					className="absolute inset-0 -z-30 size-full object-cover"
					src={featuredTestimony.image}
				/>
				<div className="absolute inset-0 -z-20 bg-linear-to-r from-foreground/95 via-foreground/75 to-foreground/20" />
				<div className="absolute inset-0 -z-10 bg-linear-to-t from-foreground/70 via-transparent to-foreground/20" />

				<div className="grid min-h-100 gap-10 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-end lg:px-9 lg:py-9">
					<div className="flex max-w-xl flex-col items-start">
						<p className="font-medium text-[11px] text-white/75 uppercase tracking-[0.22em]">
							Featured testimony
						</p>
						<h2
							className="mt-3 max-w-lg font-serif text-3xl leading-[1.04] tracking-[-0.035em] sm:text-4xl"
							id="featured-community-post-title"
						>
							{featuredTestimony.title}
						</h2>
						<p className="mt-4 max-w-lg text-sm text-white/80 leading-6 sm:text-base">
							{featuredTestimony.excerpt}
						</p>

						<div className="mt-6 flex items-center gap-3">
							<Avatar>
								<AvatarImage
									alt={featuredTestimony.author.name}
									src={featuredTestimony.author.image}
								/>
								<AvatarFallback>
									{featuredTestimony.author.initials}
								</AvatarFallback>
							</Avatar>
							<div className="text-sm leading-5">
								<p className="font-medium">{featuredTestimony.author.name}</p>
								<p className="text-white/70 text-xs">
									{featuredTestimony.publishedAt}
								</p>
							</div>
						</div>

						<Link
							className={cn(
								buttonVariants({ size: "lg" }),
								"mt-6 h-10 rounded-lg bg-card px-4 text-card-foreground hover:bg-card/90",
							)}
							to="/library/testimonials"
						>
							Read Testimony
							<ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
						</Link>
					</div>

					<blockquote className="hidden self-center border-white/25 border-l pl-5 text-white/85 lg:block">
						<p className="font-serif text-sm italic leading-6">
							“{featuredTestimony.scripture.text}”
						</p>
						<footer className="mt-3 font-medium text-[10px] text-white/65 uppercase tracking-[0.2em]">
							{featuredTestimony.scripture.reference}
						</footer>
					</blockquote>
				</div>
			</article>
		</section>
	);
}
