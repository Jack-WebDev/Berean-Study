import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@berean-study/ui/components/avatar";
import { Button } from "@berean-study/ui/components/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { Link } from "@tanstack/react-router";
import { BookmarkCheckIcon, BookmarkIcon, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

export type CommunityPostType = "collection" | "note" | "testimony" | "prayer";

export type CommunityPostCardData = {
	author: {
		id: string;
		image?: string | null;
		name: string;
	};
	coverImage?: string | null;
	excerpt: string;
	href: string;
	id: string;
	isBookmarked: boolean;
	publishedAt: Date | string;
	title: string;
	type: CommunityPostType;
};

export function CommunityPostCard({
	onBookmarkChange,
	post,
}: {
	onBookmarkChange?: (
		postId: string,
		isBookmarked: boolean,
	) => Promise<void> | void;
	post: CommunityPostCardData;
}) {
	const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);

	useEffect(() => {
		setIsBookmarked(post.isBookmarked);
	}, [post.isBookmarked]);

	const handleBookmarkChange = async () => {
		const nextIsBookmarked = !isBookmarked;
		setIsBookmarked(nextIsBookmarked);
		try {
			await onBookmarkChange?.(post.id, nextIsBookmarked);
		} catch {
			setIsBookmarked(!nextIsBookmarked);
		}
	};

	return (
		<Card className="h-full overflow-hidden rounded-xl border-border/70 py-0 shadow-sm">
			<Link
				aria-label={`Read ${post.title}`}
				className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
				to={post.href}
			>
				{post.coverImage ? (
					<img
						alt=""
						className="aspect-16/7 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
						decoding="async"
						loading="lazy"
						src={post.coverImage}
					/>
				) : (
					<div className="flex aspect-16/7 items-center justify-center bg-muted text-muted-foreground">
						<ImageIcon aria-hidden="true" className="size-5" />
					</div>
				)}
			</Link>

			<CardHeader className="gap-2 px-4 pt-4 pb-0">
				<p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
					{post.type}
				</p>
				<CardTitle className="line-clamp-2 font-serif text-lg leading-[1.15] tracking-[-0.02em]">
					<Link
						className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						to={post.href}
					>
						{post.title}
					</Link>
				</CardTitle>
			</CardHeader>

			<CardContent className="flex-1 px-4">
				<p className="line-clamp-3 text-muted-foreground text-sm leading-5">
					{post.excerpt}
				</p>
			</CardContent>

			<CardFooter className="flex items-end justify-between gap-3 border-0 bg-transparent px-4 pt-0 pb-4">
				<div className="flex min-w-0 items-center gap-2">
					<Avatar size="sm">
						{post.author.image ? (
							<AvatarImage alt={post.author.name} src={post.author.image} />
						) : null}
						<AvatarFallback>{initialsFor(post.author.name)}</AvatarFallback>
					</Avatar>
					<div className="min-w-0 text-xs leading-4">
						<p className="truncate font-medium text-foreground">
							{post.author.name}
						</p>
						<p className="text-muted-foreground">
							{formatPublishedAt(post.publishedAt)}
						</p>
					</div>
				</div>

				<Button
					aria-label={`${isBookmarked ? "Remove" : "Save"} ${post.title}`}
					className="h-7 rounded-md px-2 text-muted-foreground hover:text-foreground"
					onClick={handleBookmarkChange}
					size="sm"
					type="button"
					variant="ghost"
				>
					{isBookmarked ? (
						<BookmarkCheckIcon aria-hidden="true" data-icon="inline-start" />
					) : (
						<BookmarkIcon aria-hidden="true" data-icon="inline-start" />
					)}
					{isBookmarked ? "Saved" : "Save"}
				</Button>
			</CardFooter>
		</Card>
	);
}

function initialsFor(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

function formatPublishedAt(publishedAt: Date | string) {
	if (typeof publishedAt === "string") {
		const parsedDate = new Date(publishedAt);
		if (Number.isNaN(parsedDate.getTime())) return publishedAt;
		return relativeDate(parsedDate);
	}

	return relativeDate(publishedAt);
}

function relativeDate(date: Date) {
	const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
	const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

	if (Math.abs(days) < 7) return formatter.format(days, "day");

	const weeks = Math.round(days / 7);
	if (Math.abs(weeks) < 5) return formatter.format(weeks, "week");

	const months = Math.round(days / 30);
	return formatter.format(months, "month");
}
