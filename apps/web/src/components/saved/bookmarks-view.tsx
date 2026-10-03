import type { CommunityPostType } from "@berean-study/db/community";
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

import type { SavedLibraryBookmark } from "./saved-library";

const bookmarkFilters = [
	{ label: "All", value: "all" },
	{ label: "Scripture", value: "scripture" },
	{ label: "Community", value: "community" },
] as const;

type BookmarkFilter = (typeof bookmarkFilters)[number]["value"];
type BadgeTone = "blue" | "green" | "purple" | "gold";

const communityBookmarkTypes = {
	collection: { icon: FolderIcon, tone: "gold" },
	note: { icon: FileTextIcon, tone: "blue" },
	prayer: { icon: HandHeartIcon, tone: "purple" },
	testimony: { icon: UsersRoundIcon, tone: "green" },
} as const satisfies Record<
	CommunityPostType,
	{ icon: typeof BookOpenIcon; tone: BadgeTone }
>;

export function BookmarksView({
	bookmarks,
	onRemove,
}: {
	bookmarks: readonly SavedLibraryBookmark[];
	onRemove: (bookmark: SavedLibraryBookmark) => Promise<void>;
}) {
	const [activeFilter, setActiveFilter] = useState<BookmarkFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("list");
	const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
	const bookmarkCounts = {
		all: bookmarks.length,
		community: bookmarks.filter((item) => item.kind === "community").length,
		scripture: bookmarks.filter((item) => item.kind === "scripture").length,
	};
	const visibleBookmarks = bookmarks.filter((bookmark) => {
		const matchesFilter =
			activeFilter === "all" || bookmark.kind === activeFilter;
		return (
			matchesFilter && bookmarkSearchText(bookmark).includes(normalizedQuery)
		);
	});

	if (bookmarks.length === 0) return <BookmarksEmptyState />;

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
			{visibleBookmarks.length === 0 ? (
				<NoBookmarksFound />
			) : (
				<BookmarkList
					bookmarks={visibleBookmarks}
					onRemove={onRemove}
					viewMode={viewMode}
				/>
			)}
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

function NoBookmarksFound() {
	return (
		<div className="rounded-xl border border-border/70 bg-card px-5 py-12 text-center">
			<SearchIcon
				aria-hidden="true"
				className="mx-auto size-5 text-muted-foreground"
			/>
			<h2 className="mt-3 font-serif text-lg">No bookmarks found</h2>
			<p className="mt-1 text-muted-foreground text-sm">
				Try a different title or type.
			</p>
		</div>
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
			<div className="flex min-w-0 flex-1 gap-2 lg:ml-auto lg:max-w-164">
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
	viewMode,
}: {
	bookmarks: readonly SavedLibraryBookmark[];
	onRemove: (bookmark: SavedLibraryBookmark) => Promise<void>;
	viewMode: "grid" | "list";
}) {
	return (
		<ul
			className={
				viewMode === "grid"
					? "grid gap-2 sm:grid-cols-2"
					: "flex flex-col gap-2"
			}
		>
			{bookmarks.map((bookmark) => (
				<BookmarkCard
					bookmark={bookmark}
					key={`${bookmark.kind}-${bookmarkId(bookmark)}`}
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
	bookmark: SavedLibraryBookmark;
	onRemove: (bookmark: SavedLibraryBookmark) => Promise<void>;
}) {
	const isScripture = bookmark.kind === "scripture";
	const title = isScripture ? bookmark.item.label : bookmark.item.title;
	const href = isScripture
		? `/bible?passage=${bookmark.item.passageId}`
		: "/community";
	const BadgeIcon = isScripture
		? BookOpenIcon
		: communityBookmarkTypes[bookmark.item.type].icon;

	return (
		<li>
			<article className="group relative grid gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-[0_2px_8px_color-mix(in_oklab,var(--foreground),transparent_95%)] transition-colors hover:bg-secondary/20 sm:min-h-28 sm:grid-cols-[6.25rem_minmax(0,1fr)_auto] sm:gap-4">
				<a
					aria-label={`Open ${title}`}
					className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					href={href}
				>
					<span className="sr-only">Open {title}</span>
				</a>
				{isScripture ? (
					<img
						alt=""
						className="relative aspect-square size-20 self-start rounded-lg object-cover sm:size-25 sm:self-center"
						src="/library-verse-bg.png"
					/>
				) : bookmark.item.coverImage ? (
					<img
						alt=""
						className="relative aspect-square size-20 self-start rounded-lg object-cover sm:size-25 sm:self-center"
						src={bookmark.item.coverImage}
					/>
				) : (
					<div
						aria-hidden="true"
						className="relative aspect-square size-20 self-start rounded-lg bg-secondary sm:size-25 sm:self-center"
					/>
				)}
				<div className="relative min-w-0 self-start sm:self-center">
					<Badge
						className={badgeClassName(bookmarkBadgeTone(bookmark))}
						variant="secondary"
					>
						<BadgeIcon aria-hidden="true" data-icon="inline-start" />
						{bookmarkBadgeLabel(bookmark)}
					</Badge>
					<h2 className="mt-1 truncate font-serif text-base leading-5 tracking-[-0.015em] sm:text-lg">
						{title}
					</h2>
					<p className="mt-1 text-muted-foreground text-xs leading-4 sm:text-sm sm:leading-5">
						{isScripture
							? "Saved Scripture passage"
							: `Saved Community ${capitalize(bookmark.item.type)}`}
					</p>
				</div>
				<div className="relative col-span-2 flex items-center gap-3 pt-1 text-right sm:col-span-1 sm:self-end sm:pt-0 sm:pl-1">
					<BookmarkIcon
						aria-hidden="true"
						className="hidden size-4 fill-[oklch(0.68_0.13_85)] text-[oklch(0.68_0.13_85)] sm:block"
					/>
					<BookmarkMenu bookmark={bookmark} href={href} onRemove={onRemove} />
				</div>
			</article>
		</li>
	);
}

function BookmarkMenu({
	bookmark,
	href,
	onRemove,
}: {
	bookmark: SavedLibraryBookmark;
	href: string;
	onRemove: (bookmark: SavedLibraryBookmark) => Promise<void>;
}) {
	const title =
		bookmark.kind === "scripture" ? bookmark.item.label : bookmark.item.title;
	const openLabel =
		bookmark.kind === "scripture" ? "Open passage" : "Open Community";
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={`Options for ${title}`}
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
					<DropdownMenuItem render={<a href={href} />}>
						{openLabel}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => void onRemove(bookmark)}
						variant="destructive"
					>
						Remove bookmark
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function bookmarkSearchText(bookmark: SavedLibraryBookmark) {
	return [
		bookmark.kind === "scripture" ? bookmark.item.label : bookmark.item.title,
		bookmarkBadgeLabel(bookmark),
	]
		.join(" ")
		.toLocaleLowerCase();
}

function bookmarkId(bookmark: SavedLibraryBookmark) {
	return bookmark.kind === "scripture"
		? bookmark.item.passageId
		: bookmark.item.id;
}

function getBookmarksLabel(count: number, filter: BookmarkFilter) {
	if (filter === "scripture")
		return `${count} Scripture bookmark${count === 1 ? "" : "s"}`;
	if (filter === "community")
		return `${count} Community bookmark${count === 1 ? "" : "s"}`;
	return `${count} saved item${count === 1 ? "" : "s"}`;
}

function bookmarkBadgeLabel(bookmark: SavedLibraryBookmark) {
	return bookmark.kind === "scripture"
		? "Scripture"
		: `${capitalize(bookmark.item.type)} · Community`;
}

function bookmarkBadgeTone(bookmark: SavedLibraryBookmark): BadgeTone {
	return bookmark.kind === "scripture"
		? "blue"
		: communityBookmarkTypes[bookmark.item.type].tone;
}

function capitalize(value: string) {
	return `${value.slice(0, 1).toLocaleUpperCase()}${value.slice(1)}`;
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
