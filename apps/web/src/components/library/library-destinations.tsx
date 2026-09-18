import type { LibraryDestinationCounts } from "@berean-study/db/library-destination-counts";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	BookmarkIcon,
	FileTextIcon,
	FolderIcon,
	HeartIcon,
} from "lucide-react";

const libraryDestinations = [
	{
		count: (counts: LibraryDestinationCounts) => counts.notes,
		description: "Personal observations and study notes",
		icon: FileTextIcon,
		iconClassName: "library-note-icon",
		label: "Notes",
		to: "/library/notes",
	},
	{
		count: (counts: LibraryDestinationCounts) => counts.collections,
		description: "Curated studies and passages",
		icon: FolderIcon,
		iconClassName: "library-collection-icon",
		label: "Collections",
		to: "/library/collections",
	},
	{
		count: (counts: LibraryDestinationCounts) => counts.saved,
		description: "Highlights and bookmarks",
		icon: BookmarkIcon,
		iconClassName: "library-saved-icon",
		label: "Saved",
		to: "/library/saved",
	},
	{
		count: (counts: LibraryDestinationCounts) => counts.prayersAndTestimonies,
		description: "Personal prayers and stories",
		icon: HeartIcon,
		iconClassName: "library-prayer-icon",
		label: "Prayers & Testimonies",
		to: "/library/prayers",
	},
] as const;

export type LibraryDestinationCountsState =
	| { status: "error" }
	| { status: "loading" }
	| { counts: LibraryDestinationCounts; status: "ready" };

export function LibraryDestinations({
	counts,
}: {
	counts: LibraryDestinationCountsState;
}) {
	return (
		<section aria-labelledby="your-library-heading">
			<div>
				<h2
					className="font-serif text-2xl tracking-[-0.015em]"
					id="your-library-heading"
				>
					Your Library
				</h2>
				<p className="mt-0.5 text-muted-foreground text-sm">
					Quick access to your study material.
				</p>
			</div>
			<div className="mt-3 grid gap-3 lg:grid-cols-2">
				{libraryDestinations.map((destination) => (
					<LibraryDestinationCard
						count={counts}
						destination={destination}
						key={destination.to}
					/>
				))}
			</div>
		</section>
	);
}

function LibraryDestinationCard({
	count,
	destination,
}: {
	count: LibraryDestinationCountsState;
	destination: (typeof libraryDestinations)[number];
}) {
	const Icon = destination.icon;

	return (
		<Link
			className="group flex min-h-17 items-center gap-4 rounded-xl border bg-card/60 px-4 py-3 shadow-[0_5px_18px_color-mix(in_oklch,var(--foreground),transparent_97%)] transition-colors hover:border-primary/25 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			to={destination.to}
		>
			<span
				className={cn(
					"flex size-12 shrink-0 items-center justify-center rounded-full",
					destination.iconClassName,
				)}
			>
				<Icon aria-hidden="true" className="size-6" strokeWidth={1.7} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block font-serif text-base">{destination.label}</span>
				<span className="mt-0.5 block truncate text-muted-foreground text-xs">
					{destination.description}
				</span>
			</span>
			<DestinationCount count={count} destination={destination} />
			<ArrowRightIcon
				aria-hidden="true"
				className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
			/>
		</Link>
	);
}

function DestinationCount({
	count,
	destination,
}: {
	count: LibraryDestinationCountsState;
	destination: (typeof libraryDestinations)[number];
}) {
	if (count.status === "loading") {
		return <Skeleton aria-label="Loading item count" className="h-4 w-5" />;
	}

	if (count.status === "error") {
		return (
			<span
				aria-label="Item count unavailable"
				className="text-muted-foreground text-sm"
				role="status"
			>
				—
			</span>
		);
	}

	return (
		<span className="text-muted-foreground text-sm tabular-nums">
			{destination.count(count.counts)}
		</span>
	);
}
