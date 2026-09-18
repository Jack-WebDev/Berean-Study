import type { RecentLibraryActivity } from "@berean-study/db/recent-library-activity";
import { Separator } from "@berean-study/ui/components/separator";
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

export type RecentLibraryActivityState =
	| { status: "error" }
	| { status: "loading" }
	| { items: RecentLibraryActivity[]; status: "ready" };

export function RecentLibraryActivitySection({
	state,
}: {
	state: RecentLibraryActivityState;
}) {
	return (
		<section aria-labelledby="recent-heading">
			<div className="flex items-end justify-between gap-4">
				<div>
					<h2
						className="font-serif text-2xl tracking-[-0.015em]"
						id="recent-heading"
					>
						Recent
					</h2>
					<p className="mt-0.5 text-muted-foreground text-sm">
						Your latest notes, prayers, testimonies, and collections.
					</p>
				</div>
				<Link
					className="hidden items-center gap-1 font-medium text-primary text-sm hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
					to="/history"
				>
					View all
					<ArrowRightIcon aria-hidden="true" className="size-4" />
				</Link>
			</div>
			{state.status === "loading" ? <RecentLibraryActivityLoading /> : null}
			{state.status === "error" ? <RecentLibraryActivityUnavailable /> : null}
			{state.status === "ready" ? (
				state.items.length > 0 ? (
					<RecentLibraryActivityList items={state.items} />
				) : (
					<RecentLibraryActivityEmpty />
				)
			) : null}
		</section>
	);
}

function RecentLibraryActivityList({
	items,
}: {
	items: RecentLibraryActivity[];
}) {
	return (
		<div className="mt-2 border-border border-y">
			{items.map((item, index) => (
				<div key={`${item.kind}-${item.id}`}>
					{index > 0 ? <Separator /> : null}
					<RecentLibraryActivityLink item={item} />
				</div>
			))}
		</div>
	);
}

function RecentLibraryActivityLink({ item }: { item: RecentLibraryActivity }) {
	const {
		description,
		icon: Icon,
		iconClassName,
	} = getActivityPresentation(item.kind);
	const content = (
		<>
			<span
				className={cn(
					"flex size-10 shrink-0 items-center justify-center rounded-full",
					iconClassName,
				)}
			>
				<Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium text-sm">{item.title}</span>
				<span className="mt-0.5 block text-muted-foreground text-sm">
					{description}
				</span>
			</span>
			<time
				className="hidden shrink-0 text-muted-foreground text-sm sm:block"
				dateTime={item.updatedAt.toISOString()}
			>
				{formatActivityDate(item.updatedAt)}
			</time>
			<ArrowRightIcon
				aria-hidden="true"
				className="size-4 shrink-0 text-primary"
			/>
		</>
	);

	const className =
		"flex items-center gap-4 py-2.5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

	switch (item.kind) {
		case "collection":
			return (
				<Link
					className={className}
					params={{ collectionId: String(item.id) }}
					to="/library/collections/$collectionId"
				>
					{content}
				</Link>
			);
		case "note":
			return (
				<Link
					className={className}
					search={{ note: item.id }}
					to="/library/notes"
				>
					{content}
				</Link>
			);
		case "prayer":
			return (
				<Link className={className} to="/library/prayers">
					{content}
				</Link>
			);
		case "testimony":
			return (
				<Link className={className} to="/library/testimonies">
					{content}
				</Link>
			);
	}
}

function RecentLibraryActivityLoading() {
	return (
		<div aria-busy="true" className="mt-4">
			<Skeleton className="h-5 w-48" />
			<Skeleton className="mt-2 h-4 w-24" />
			<Separator className="my-4" />
			<Skeleton className="h-5 w-56" />
			<Skeleton className="mt-2 h-4 w-20" />
			<Separator className="my-4" />
			<Skeleton className="h-5 w-44" />
			<Skeleton className="mt-2 h-4 w-28" />
		</div>
	);
}

function RecentLibraryActivityEmpty() {
	return (
		<p className="mt-4 max-w-md text-muted-foreground text-sm leading-6">
			Notes, collections, prayers, and testimonies you create will appear here.
		</p>
	);
}

function RecentLibraryActivityUnavailable() {
	return (
		<p className="mt-4 max-w-md text-muted-foreground text-sm leading-6">
			Your recent library activity is unavailable right now.
		</p>
	);
}

function getActivityPresentation(kind: RecentLibraryActivity["kind"]) {
	switch (kind) {
		case "collection":
			return {
				description: "Saved study collection",
				icon: FolderIcon,
				iconClassName: "library-collection-icon",
			};
		case "note":
			return {
				description: "Personal study note",
				icon: FileTextIcon,
				iconClassName: "library-note-icon",
			};
		case "prayer":
			return {
				description: "Personal prayer",
				icon: HeartIcon,
				iconClassName: "library-prayer-icon",
			};
		case "testimony":
			return {
				description: "Personal testimony",
				icon: BookmarkIcon,
				iconClassName: "library-saved-icon",
			};
	}
}

function formatActivityDate(value: Date) {
	const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
	const hoursAgo = Math.floor(elapsed / 3_600_000);

	if (hoursAgo < 1) return "Just now";
	if (hoursAgo < 24) return `${hoursAgo}h ago`;

	const daysAgo = Math.floor(hoursAgo / 24);
	if (daysAgo === 1) return "Yesterday";
	if (daysAgo < 7) return `${daysAgo} days ago`;

	return new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}
