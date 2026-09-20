import { Avatar, AvatarFallback } from "@berean-study/ui/components/avatar";
import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";
import {
	BookmarkIcon,
	BookOpenIcon,
	EllipsisVerticalIcon,
	FileTextIcon,
	FolderIcon,
	Grid2X2Icon,
	HandHeartIcon,
	LayoutListIcon,
	SearchIcon,
	UsersRoundIcon,
} from "lucide-react";
import { useState } from "react";

import type { BookmarkItem } from "./saved-fixtures";

const bookmarkFilters = [
	{ label: "All", value: "all" },
	{ label: "Scripture", value: "scripture" },
	{ label: "Community", value: "community" },
] as const;

type BookmarkFilter = (typeof bookmarkFilters)[number]["value"];
type BadgeTone = "blue" | "green" | "purple" | "gold";

const communityBookmarkTypes = {
	Collection: { icon: FolderIcon, tone: "gold" },
	Note: { icon: FileTextIcon, tone: "blue" },
	Prayer: { icon: HandHeartIcon, tone: "purple" },
	Testimony: { icon: UsersRoundIcon, tone: "green" },
} as const satisfies Record<
	string,
	{ icon: typeof BookOpenIcon; tone: BadgeTone }
>;

export function BookmarksView({
	bookmarks,
	onRemove,
}: {
	bookmarks: readonly BookmarkItem[];
	onRemove: (bookmark: BookmarkItem) => void;
}) {
	const [activeFilter, setActiveFilter] = useState<BookmarkFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("list");
	const bookmarkCounts = {
		all: bookmarks.length,
		community: bookmarks.filter((item) => item.kind === "community").length,
		scripture: bookmarks.filter((item) => item.kind === "scripture").length,
	};
	const visibleBookmarks = bookmarks.filter((item) => {
		const matchesFilter = activeFilter === "all" || item.kind === activeFilter;
		const searchableText = [
			item.kind === "community" ? item.author : undefined,
			bookmarkBadgeLabel(item),
			item.description,
			item.title,
		].join(" ");

		return (
			matchesFilter &&
			searchableText
				.toLocaleLowerCase()
				.includes(searchQuery.toLocaleLowerCase())
		);
	});

	if (bookmarks.length === 0) {
		return <BookmarksEmptyState />;
	}

	return (
		<section aria-label="Saved bookmarks" className="flex flex-col gap-4">
			<BookmarkToolbar
				activeFilter={activeFilter}
				bookmarkCounts={bookmarkCounts}
				onFilterChange={setActiveFilter}
				onSearchChange={setSearchQuery}
				onViewModeChange={setViewMode}
				searchQuery={searchQuery}
				viewMode={viewMode}
			/>
			<p aria-live="polite" className="text-muted-foreground text-sm">
				{getBookmarksLabel(visibleBookmarks.length, activeFilter)}
			</p>
			<BookmarkList bookmarks={visibleBookmarks} onRemove={onRemove} />
		</section>
	);
}

function BookmarksEmptyState() {
	return (
		<section aria-label="Saved bookmarks">
			<Empty className="min-h-64 rounded-xl border border-border/70 bg-card py-12">
				<EmptyHeader>
					<EmptyTitle className="font-serif text-lg">
						No bookmarks yet
					</EmptyTitle>
					<EmptyDescription className="max-w-64 text-sm">
						Scripture passages and Community posts you save will appear here.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</section>
	);
}

function BookmarkToolbar({
	activeFilter,
	bookmarkCounts,
	onFilterChange,
	onSearchChange,
	onViewModeChange,
	searchQuery,
	viewMode,
}: {
	activeFilter: BookmarkFilter;
	bookmarkCounts: Record<BookmarkFilter, number>;
	onFilterChange: (filter: BookmarkFilter) => void;
	onSearchChange: (query: string) => void;
	onViewModeChange: (viewMode: "grid" | "list") => void;
	searchQuery: string;
	viewMode: "grid" | "list";
}) {
	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			<ToggleGroup
				aria-label="Bookmark filters"
				className="max-w-full flex-wrap gap-2"
				onValueChange={(values) => {
					const filter = values[0] as BookmarkFilter | undefined;
					if (filter) onFilterChange(filter);
				}}
				spacing={2}
				value={[activeFilter]}
				variant="outline"
			>
				{bookmarkFilters.map((filter) => (
					<ToggleGroupItem
						className="h-9 rounded-full border-border/70 bg-card px-4 text-primary text-xs data-pressed:border-transparent data-pressed:bg-secondary data-pressed:text-primary"
						key={filter.value}
						value={filter.value}
					>
						{filter.value === "scripture" ? (
							<BookOpenIcon aria-hidden="true" data-icon="inline-start" />
						) : filter.value === "community" ? (
							<UsersRoundIcon aria-hidden="true" data-icon="inline-start" />
						) : null}
						{filter.label} ({bookmarkCounts[filter.value]})
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:ml-auto lg:max-w-164">
				<label className="min-w-0 flex-1" htmlFor="saved-search">
					<span className="sr-only">Search saved items</span>
					<InputGroup className="h-9 rounded-lg border-border/70 bg-card">
						<InputGroupAddon align="inline-start">
							<SearchIcon aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							id="saved-search"
							onChange={(event) => onSearchChange(event.target.value)}
							placeholder="Search your saved items..."
							type="search"
							value={searchQuery}
						/>
					</InputGroup>
				</label>
				<label className="w-full sm:w-36" htmlFor="saved-sort">
					<span className="sr-only">Sort saved items</span>
					<NativeSelect
						className="w-full **:data-[slot=native-select]:rounded-lg **:data-[slot=native-select]:border-border/70 **:data-[slot=native-select]:bg-card"
						id="saved-sort"
					>
						<NativeSelectOption value="recent">Most Recent</NativeSelectOption>
						<NativeSelectOption value="oldest">Oldest</NativeSelectOption>
					</NativeSelect>
				</label>
				<label className="w-full sm:w-32" htmlFor="saved-date">
					<span className="sr-only">Saved date range</span>
					<NativeSelect
						className="w-full **:data-[slot=native-select]:rounded-lg **:data-[slot=native-select]:border-border/70 **:data-[slot=native-select]:bg-card"
						id="saved-date"
					>
						<NativeSelectOption value="all-time">All Time</NativeSelectOption>
					</NativeSelect>
				</label>
				<ToggleGroup
					aria-label="Saved item layout"
					className="overflow-hidden rounded-lg"
					onValueChange={(values) => {
						const nextViewMode = values[0] as "grid" | "list" | undefined;
						if (nextViewMode) onViewModeChange(nextViewMode);
					}}
					spacing={0}
					value={[viewMode]}
					variant="outline"
				>
					<ToggleGroupItem
						aria-label="List view"
						className="size-9 rounded-l-lg border-border/70 bg-card data-pressed:border-transparent data-pressed:bg-secondary data-pressed:text-primary"
						value="list"
					>
						<LayoutListIcon aria-hidden="true" />
					</ToggleGroupItem>
					<ToggleGroupItem
						aria-label="Grid view"
						className="size-9 rounded-r-lg border-border/70 bg-card data-pressed:border-transparent data-pressed:bg-secondary data-pressed:text-primary"
						value="grid"
					>
						<Grid2X2Icon aria-hidden="true" />
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>
	);
}

function BookmarkList({
	bookmarks,
	onRemove,
}: {
	bookmarks: readonly BookmarkItem[];
	onRemove: (bookmark: BookmarkItem) => void;
}) {
	return (
		<ul className="flex flex-col gap-2">
			{bookmarks.map((bookmark) => (
				<BookmarkCard
					bookmark={bookmark}
					key={bookmark.id}
					onRemove={onRemove}
				/>
			))}
		</ul>
	);
}

function BookmarkCard({
	bookmark,
	onRemove,
}: {
	bookmark: BookmarkItem;
	onRemove: (bookmark: BookmarkItem) => void;
}) {
	const BadgeIcon =
		bookmark.kind === "scripture"
			? BookOpenIcon
			: communityBookmarkTypes[bookmark.resourceType].icon;

	return (
		<li>
			<article className="group relative grid gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-[0_2px_8px_color-mix(in_oklab,var(--foreground),transparent_95%)] transition-colors hover:bg-secondary/20 sm:min-h-28 sm:grid-cols-[6.25rem_minmax(0,1fr)_auto] sm:gap-4">
				<a
					aria-label={`Open ${bookmark.title}`}
					className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					href={bookmark.href}
				>
					<span className="sr-only">Open {bookmark.title}</span>
				</a>
				<img
					alt=""
					className={`relative aspect-square size-20 self-start rounded-lg object-cover sm:size-25 sm:self-center ${bookmark.thumbnailPosition}`}
					src="/library-verse-bg.png"
				/>
				<div className="relative min-w-0 self-start sm:self-center">
					<Badge
						className={badgeClassName(bookmarkBadgeTone(bookmark))}
						variant="secondary"
					>
						<BadgeIcon aria-hidden="true" data-icon="inline-start" />
						{bookmarkBadgeLabel(bookmark)}
					</Badge>
					<div className="mt-1 flex min-w-0 items-baseline gap-2">
						<h2 className="truncate font-serif text-base leading-5 tracking-[-0.015em] sm:text-lg">
							{bookmark.title}
						</h2>
						{bookmark.kind === "scripture" ? (
							<span className="shrink-0 text-[0.65rem] text-muted-foreground">
								{bookmark.translation}
							</span>
						) : null}
					</div>
					{bookmark.kind === "community" ? (
						<div className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
							<Avatar size="sm">
								<AvatarFallback>{bookmark.authorInitials}</AvatarFallback>
							</Avatar>
							<span>{bookmark.author}</span>
						</div>
					) : null}
					<p className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-4 sm:text-sm sm:leading-5">
						{bookmark.kind === "community" && bookmark.meta
							? `${bookmark.meta} · `
							: ""}
						{bookmark.description}
					</p>
				</div>
				<div className="relative col-span-2 flex items-center gap-3 pt-1 text-right sm:col-span-1 sm:gap-4 sm:self-end sm:pt-0 sm:pl-1">
					<BookmarkIcon
						aria-hidden="true"
						className="hidden size-4 fill-[oklch(0.68_0.13_85)] text-[oklch(0.68_0.13_85)] sm:block"
					/>
					<span className="mr-auto whitespace-nowrap text-[0.7rem] text-muted-foreground sm:mr-0">
						{bookmark.savedAt}
					</span>
					<BookmarkMenu bookmark={bookmark} onRemove={onRemove} />
				</div>
			</article>
		</li>
	);
}

function BookmarkMenu({
	bookmark,
	onRemove,
}: {
	bookmark: BookmarkItem;
	onRemove: (bookmark: BookmarkItem) => void;
}) {
	const openLabel =
		bookmark.kind === "scripture" ? "Open passage" : "Open post";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={`Options for ${bookmark.title}`}
						className="size-7 rounded-md"
						size="icon-sm"
						type="button"
						variant="ghost"
					/>
				}
			>
				<EllipsisVerticalIcon aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40 rounded-lg p-1">
				<DropdownMenuGroup>
					<DropdownMenuItem render={<a href={bookmark.href} />}>
						{openLabel}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => onRemove(bookmark)}
						variant="destructive"
					>
						Remove bookmark
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function getBookmarksLabel(count: number, filter: BookmarkFilter) {
	if (filter === "scripture") {
		return `${count} Scripture bookmark${count === 1 ? "" : "s"}`;
	}

	if (filter === "community") {
		return `${count} Community bookmark${count === 1 ? "" : "s"}`;
	}

	return `${count} saved item${count === 1 ? "" : "s"}`;
}

function bookmarkBadgeLabel(bookmark: BookmarkItem) {
	return bookmark.kind === "scripture"
		? "Scripture"
		: `${bookmark.resourceType} · Community`;
}

function bookmarkBadgeTone(bookmark: BookmarkItem): BadgeTone {
	if (bookmark.kind === "scripture") return "blue";

	return communityBookmarkTypes[bookmark.resourceType].tone;
}

function badgeClassName(tone: BadgeTone) {
	return {
		blue: "rounded-full border-0 bg-[color:oklch(0.94_0.035_245)] text-[color:oklch(0.42_0.12_245)]",
		gold: "rounded-full border-0 bg-[color:oklch(0.94_0.045_85)] text-[color:oklch(0.52_0.1_75)]",
		green:
			"rounded-full border-0 bg-[color:oklch(0.93_0.05_150)] text-[color:oklch(0.4_0.1_150)]",
		purple:
			"rounded-full border-0 bg-[color:oklch(0.94_0.04_300)] text-[color:oklch(0.45_0.1_300)]",
	}[tone];
}
