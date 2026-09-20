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
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Tabs, TabsList, TabsTrigger } from "@berean-study/ui/components/tabs";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";
import {
	BookmarkIcon,
	BookOpenIcon,
	EllipsisVerticalIcon,
	Grid2X2Icon,
	HighlighterIcon,
	LayoutListIcon,
	LibraryBigIcon,
	SearchIcon,
	UsersRoundIcon,
} from "lucide-react";
import { useState } from "react";

const bookmarkFilters = [
	{ label: "All (4)", value: "all" },
	{ label: "Scripture (1)", value: "scripture" },
	{ label: "Community (3)", value: "community" },
] as const;

type BookmarkFilter = (typeof bookmarkFilters)[number]["value"];

type SavedItem = {
	author?: string;
	authorInitials?: string;
	badge: string;
	badgeIcon: "community" | "collection" | "scripture";
	badgeTone: "blue" | "green" | "purple" | "gold";
	description: string;
	id: string;
	kind: Exclude<BookmarkFilter, "all">;
	meta?: string;
	savedAt: string;
	title: string;
	translation?: string;
	thumbnailPosition: string;
};

const savedItems: readonly SavedItem[] = [
	{
		badge: "Scripture",
		badgeIcon: "scripture",
		badgeTone: "blue",
		description:
			"For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
		id: "john-3-16",
		kind: "scripture",
		savedAt: "Saved today, 10:24 AM",
		title: "John 3:16",
		thumbnailPosition: "object-[48%_35%]",
		translation: "ESV",
	},
	{
		author: "Sarah Mitchell",
		authorInitials: "SM",
		badge: "Testimony · Community",
		badgeIcon: "community",
		badgeTone: "green",
		description:
			"After a long season of uncertainty, God showed me His faithfulness in ways I never expected. This testimony is a reminder that He is always working…",
		id: "faithfulness-waiting",
		kind: "community",
		savedAt: "Saved yesterday, 4:17 PM",
		title: "God’s Faithfulness in the Waiting",
		thumbnailPosition: "object-[30%_55%]",
	},
	{
		author: "James Carter",
		authorInitials: "JC",
		badge: "Prayer · Community",
		badgeIcon: "community",
		badgeTone: "purple",
		description:
			"Please join me in praying for my family during this season. We are facing some difficult decisions and would appreciate your prayers for wisdom and peace.",
		id: "pray-family",
		kind: "community",
		savedAt: "Saved Mar 12, 2024",
		title: "Pray for My Family",
		thumbnailPosition: "object-[64%_46%]",
	},
	{
		author: "Grace Walker",
		authorInitials: "GW",
		badge: "Collection · Community",
		badgeIcon: "collection",
		badgeTone: "gold",
		description:
			"A collection of verses that have brought me hope and peace during difficult seasons.",
		id: "hard-seasons",
		kind: "community",
		meta: "12 passages",
		savedAt: "Saved Mar 8, 2024",
		title: "Encouragement for Hard Seasons",
		thumbnailPosition: "object-[76%_65%]",
	},
];

export type SavedView = "bookmarks" | "highlights";

export function SavedPage({
	onViewChange,
	view,
}: {
	onViewChange: (view: SavedView) => void;
	view: SavedView;
}) {
	const [activeFilter, setActiveFilter] = useState<BookmarkFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("list");
	const visibleItems = savedItems.filter((item) => {
		const matchesFilter = activeFilter === "all" || item.kind === activeFilter;
		const searchableText = [
			item.author,
			item.badge,
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

	return (
		<div className="min-h-full px-5 py-7 sm:px-8 sm:py-9 lg:px-12">
			<main className="mx-auto flex w-full max-w-6xl flex-col gap-5">
				<header className="grid gap-5 border-border/70 border-b pb-3 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
					<div>
						<h1 className="font-serif text-4xl leading-none tracking-[-0.035em] sm:text-[2.7rem]">
							Saved
						</h1>
						<p className="mt-2 text-muted-foreground text-sm sm:text-base">
							Everything you’ve chosen to keep close for study and return.
						</p>
						<Tabs
							aria-label="Saved content"
							className="mt-5 border-0"
							onValueChange={(nextView) => onViewChange(nextView as SavedView)}
							value={view}
						>
							<TabsList
								className="h-10 gap-2 bg-transparent p-0"
								variant="line"
							>
								<TabsTrigger
									className="h-10 flex-none rounded-full px-5 text-muted-foreground text-sm hover:text-foreground data-active:bg-secondary data-active:text-primary data-active:after:hidden"
									value="bookmarks"
								>
									<BookmarkIcon aria-hidden="true" data-icon="inline-start" />
									Bookmarks
								</TabsTrigger>
								<TabsTrigger
									className="h-10 flex-none rounded-full px-5 text-muted-foreground text-sm hover:text-foreground data-active:bg-secondary data-active:text-primary data-active:after:hidden"
									value="highlights"
								>
									<HighlighterIcon
										aria-hidden="true"
										data-icon="inline-start"
									/>
									Highlights
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
					<SavedExplainer />
				</header>

				{view === "bookmarks" ? (
					<section aria-label="Saved bookmarks" className="flex flex-col gap-4">
						<SavedControls
							activeFilter={activeFilter}
							onFilterChange={setActiveFilter}
							onSearchChange={setSearchQuery}
							onViewModeChange={setViewMode}
							searchQuery={searchQuery}
							viewMode={viewMode}
						/>
						<p className="font-medium text-muted-foreground text-sm">
							{visibleItems.length} saved item
							{visibleItems.length === 1 ? "" : "s"}
						</p>
						<ul className="flex flex-col gap-2">
							{visibleItems.map((item) => (
								<SavedItemCard item={item} key={item.id} />
							))}
						</ul>
					</section>
				) : (
					<HighlightsPlaceholder />
				)}
			</main>
		</div>
	);
}

function SavedExplainer() {
	return (
		<aside className="flex gap-3 rounded-xl border border-border/75 bg-secondary/35 p-3.5">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[color:oklch(0.62_0.12_85)]">
				<BookOpenIcon aria-hidden="true" className="size-5" />
			</div>
			<div className="min-w-0">
				<h2 className="font-medium text-sm">Two ways to save</h2>
				<p className="mt-1 text-muted-foreground text-xs leading-4">
					Bookmark Scripture passages and Community content like prayers,
					testimonies, and collections. Highlights are for exact Scripture
					wording only.
				</p>
				<button
					className="mt-2 inline-flex items-center gap-1 font-medium text-[0.7rem] text-[color:oklch(0.62_0.12_85)]"
					type="button"
				>
					Learn more <span aria-hidden="true">→</span>
				</button>
			</div>
		</aside>
	);
}

function SavedControls({
	activeFilter,
	onFilterChange,
	onSearchChange,
	onViewModeChange,
	searchQuery,
	viewMode,
}: {
	activeFilter: BookmarkFilter;
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
				onValueChange={(values) => {
					const filter = values[0] as BookmarkFilter | undefined;
					if (filter) onFilterChange(filter);
				}}
				spacing={2}
				value={[activeFilter]}
				variant="outline"
				className="max-w-full flex-wrap gap-2"
			>
				{bookmarkFilters.map((filter) => (
					<ToggleGroupItem
						className="h-9 rounded-full border-border/70 bg-card px-4 text-xs data-[pressed]:border-transparent data-[pressed]:bg-secondary data-[pressed]:text-foreground"
						key={filter.value}
						value={filter.value}
					>
						{filter.value === "scripture" ? (
							<BookOpenIcon aria-hidden="true" data-icon="inline-start" />
						) : filter.value === "community" ? (
							<UsersRoundIcon aria-hidden="true" data-icon="inline-start" />
						) : null}
						{filter.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:ml-auto lg:max-w-[41rem]">
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
					<NativeSelect className="w-full" id="saved-sort">
						<NativeSelectOption value="recent">Most Recent</NativeSelectOption>
						<NativeSelectOption value="oldest">Oldest</NativeSelectOption>
					</NativeSelect>
				</label>
				<label className="w-full sm:w-32" htmlFor="saved-date">
					<span className="sr-only">Saved date range</span>
					<NativeSelect className="w-full" id="saved-date">
						<NativeSelectOption value="all-time">All Time</NativeSelectOption>
					</NativeSelect>
				</label>
				<ToggleGroup
					aria-label="Saved item layout"
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
						className="size-9"
						value="list"
					>
						<LayoutListIcon aria-hidden="true" />
					</ToggleGroupItem>
					<ToggleGroupItem
						aria-label="Grid view"
						className="size-9"
						value="grid"
					>
						<Grid2X2Icon aria-hidden="true" />
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>
	);
}

function SavedItemCard({ item }: { item: SavedItem }) {
	const BadgeIcon =
		item.badgeIcon === "scripture"
			? BookOpenIcon
			: item.badgeIcon === "collection"
				? LibraryBigIcon
				: UsersRoundIcon;
	return (
		<li>
			<article className="group relative grid min-h-28 grid-cols-[5rem_minmax(0,1fr)_auto] gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-[0_2px_8px_color-mix(in_oklab,var(--foreground),transparent_95%)] transition-colors hover:bg-secondary/20 sm:grid-cols-[6.25rem_minmax(0,1fr)_auto] sm:gap-4">
				<a
					aria-label={`Open ${item.title}`}
					className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					href={`#${item.id}`}
				>
					<span className="sr-only">Open {item.title}</span>
				</a>
				<img
					alt=""
					className={`relative aspect-square size-20 self-center rounded-lg object-cover sm:size-25 ${item.thumbnailPosition}`}
					src="/library-verse-bg.png"
				/>
				<div className="relative min-w-0 self-center">
					<Badge className={badgeClassName(item.badgeTone)} variant="secondary">
						<BadgeIcon aria-hidden="true" data-icon="inline-start" />
						{item.badge}
					</Badge>
					<div className="mt-1 flex min-w-0 items-baseline gap-2">
						<h2 className="truncate font-serif text-base leading-5 tracking-[-0.015em] sm:text-lg">
							{item.title}
						</h2>
						{item.translation ? (
							<span className="shrink-0 text-[0.65rem] text-muted-foreground">
								{item.translation}
							</span>
						) : null}
					</div>
					{item.author ? (
						<div className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
							<Avatar size="sm">
								<AvatarFallback>{item.authorInitials}</AvatarFallback>
							</Avatar>
							<span>{item.author}</span>
						</div>
					) : null}
					<p className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-4 sm:text-sm sm:leading-5">
						{item.meta ? `${item.meta} · ` : ""}
						{item.description}
					</p>
				</div>
				<div className="relative flex flex-col items-end justify-between gap-2 pl-1 text-right">
					<BookmarkIcon
						aria-hidden="true"
						className="size-4 fill-[color:oklch(0.68_0.13_85)] text-[color:oklch(0.68_0.13_85)]"
					/>
					<span className="hidden whitespace-nowrap text-[0.7rem] text-muted-foreground sm:block">
						{item.savedAt}
					</span>
					<SavedItemMenu title={item.title} />
				</div>
			</article>
		</li>
	);
}

function SavedItemMenu({ title }: { title: string }) {
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
					<DropdownMenuItem>Open item</DropdownMenuItem>
					<DropdownMenuItem variant="destructive">
						Remove bookmark
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function HighlightsPlaceholder() {
	return (
		<section className="rounded-xl border border-border/70 bg-card px-5 py-12 text-center">
			<HighlighterIcon
				aria-hidden="true"
				className="mx-auto size-5 text-muted-foreground"
			/>
			<h2 className="mt-3 font-serif text-lg">Your Scripture highlights</h2>
			<p className="mt-1 text-muted-foreground text-sm">
				Highlights you make while reading Scripture will appear here.
			</p>
		</section>
	);
}

function badgeClassName(tone: SavedItem["badgeTone"]) {
	return {
		blue: "rounded-full border-0 bg-[color:oklch(0.94_0.035_245)] text-[color:oklch(0.42_0.12_245)]",
		gold: "rounded-full border-0 bg-[color:oklch(0.94_0.045_85)] text-[color:oklch(0.52_0.1_75)]",
		green:
			"rounded-full border-0 bg-[color:oklch(0.93_0.05_150)] text-[color:oklch(0.4_0.1_150)]",
		purple:
			"rounded-full border-0 bg-[color:oklch(0.94_0.04_300)] text-[color:oklch(0.45_0.1_300)]",
	}[tone];
}
