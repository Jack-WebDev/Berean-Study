import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
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
import { cn } from "@berean-study/ui/lib/utils";
import {
	EllipsisVerticalIcon,
	Grid2X2Icon,
	HighlighterIcon,
	LayoutListIcon,
	SearchIcon,
} from "lucide-react";
import { useState } from "react";
import type {
	HighlightColor,
	HighlightTestament,
	SavedHighlightFixture,
} from "./saved-fixtures";

const highlightColorTreatment = {
	Blue: {
		dot: "bg-[oklch(0.62_0.1_245)]",
		mark: "bg-[oklch(0.9_0.035_245)]",
	},
	Green: {
		dot: "bg-[oklch(0.58_0.09_150)]",
		mark: "bg-[oklch(0.9_0.035_150)]",
	},
	Red: {
		dot: "bg-[oklch(0.62_0.1_25)]",
		mark: "bg-[oklch(0.91_0.035_25)]",
	},
	Yellow: {
		dot: "bg-[oklch(0.7_0.1_85)]",
		mark: "bg-[oklch(0.94_0.04_85)]",
	},
} as const satisfies Record<HighlightColor, { dot: string; mark: string }>;

export function HighlightsContent({
	highlights,
}: {
	highlights: readonly SavedHighlightFixture[];
}) {
	const [book, setBook] = useState("all");
	const [color, setColor] = useState<HighlightColor | "all">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [sort, setSort] = useState<"oldest" | "recent">("recent");
	const [testament, setTestament] = useState<HighlightTestament | "all">("all");
	const [viewMode, setViewMode] = useState<"grid" | "list">("list");
	const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
	const visibleHighlights = [...highlights]
		.filter(
			(highlight) =>
				(book === "all" || highlight.book === book) &&
				(color === "all" || highlight.color === color) &&
				(testament === "all" || highlight.testament === testament) &&
				[highlight.reference, highlight.text, highlight.translation]
					.join(" ")
					.toLocaleLowerCase()
					.includes(normalizedQuery),
		)
		.sort((left, right) =>
			sort === "recent"
				? right.createdAt.localeCompare(left.createdAt)
				: left.createdAt.localeCompare(right.createdAt),
		);

	return (
		<section
			aria-label="Saved Scripture highlights"
			className="flex flex-col gap-4"
		>
			<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-nowrap">
				<label className="min-w-0 flex-1" htmlFor="highlight-search">
					<span className="sr-only">Search your highlights</span>
					<InputGroup className="h-9 rounded-lg border-border/70 bg-card">
						<InputGroupAddon align="inline-start">
							<SearchIcon aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							id="highlight-search"
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Search your highlights..."
							type="search"
							value={searchQuery}
						/>
					</InputGroup>
				</label>
				<label className="w-full sm:w-32" htmlFor="highlight-book">
					<span className="sr-only">Filter by book</span>
					<NativeSelect
						className="w-full **:data-[slot=native-select]:rounded-lg **:data-[slot=native-select]:border-border/70 **:data-[slot=native-select]:bg-card"
						id="highlight-book"
						onChange={(event) => setBook(event.target.value)}
						value={book}
					>
						<NativeSelectOption value="all">All Books</NativeSelectOption>
						<NativeSelectOption value="John">John</NativeSelectOption>
						<NativeSelectOption value="Philippians">
							Philippians
						</NativeSelectOption>
					</NativeSelect>
				</label>
				<label className="w-full sm:w-36" htmlFor="highlight-testament">
					<span className="sr-only">Filter by testament</span>
					<NativeSelect
						className="w-full **:data-[slot=native-select]:rounded-lg **:data-[slot=native-select]:border-border/70 **:data-[slot=native-select]:bg-card"
						id="highlight-testament"
						onChange={(event) =>
							setTestament(event.target.value as HighlightTestament | "all")
						}
						value={testament}
					>
						<NativeSelectOption value="all">All Testaments</NativeSelectOption>
						<NativeSelectOption value="New">New Testament</NativeSelectOption>
						<NativeSelectOption value="Old">Old Testament</NativeSelectOption>
					</NativeSelect>
				</label>
				<label className="w-full sm:w-32" htmlFor="highlight-color">
					<span className="sr-only">Filter by highlight color</span>
					<NativeSelect
						className="w-full **:data-[slot=native-select]:rounded-lg **:data-[slot=native-select]:border-border/70 **:data-[slot=native-select]:bg-card"
						id="highlight-color"
						onChange={(event) =>
							setColor(event.target.value as HighlightColor | "all")
						}
						value={color}
					>
						<NativeSelectOption value="all">All Colors</NativeSelectOption>
						<NativeSelectOption value="Red">Red</NativeSelectOption>
						<NativeSelectOption value="Yellow">Yellow</NativeSelectOption>
						<NativeSelectOption value="Green">Green</NativeSelectOption>
						<NativeSelectOption value="Blue">Blue</NativeSelectOption>
					</NativeSelect>
				</label>
				<label className="w-full sm:w-36" htmlFor="highlight-sort">
					<span className="sr-only">Sort highlights</span>
					<NativeSelect
						className="w-full **:data-[slot=native-select]:rounded-lg **:data-[slot=native-select]:border-border/70 **:data-[slot=native-select]:bg-card"
						id="highlight-sort"
						onChange={(event) =>
							setSort(event.target.value as "oldest" | "recent")
						}
						value={sort}
					>
						<NativeSelectOption value="recent">Most Recent</NativeSelectOption>
						<NativeSelectOption value="oldest">Oldest</NativeSelectOption>
					</NativeSelect>
				</label>
				<ToggleGroup
					aria-label="Highlight layout"
					className="overflow-hidden rounded-lg"
					onValueChange={(values) => {
						const nextViewMode = values[0] as "grid" | "list" | undefined;
						if (nextViewMode) setViewMode(nextViewMode);
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

			<p aria-live="polite" className="text-muted-foreground text-sm">
				{visibleHighlights.length} highlight
				{visibleHighlights.length === 1 ? "" : "s"}
			</p>

			<ul
				className={cn(
					"gap-2",
					viewMode === "grid" ? "grid sm:grid-cols-2" : "flex flex-col",
				)}
			>
				{visibleHighlights.map((highlight) => (
					<li key={highlight.id}>
						<HighlightCard highlight={highlight} />
					</li>
				))}
			</ul>

			{visibleHighlights.length === 0 ? (
				<div className="rounded-xl border border-border/70 bg-card px-5 py-12 text-center">
					<HighlighterIcon
						aria-hidden="true"
						className="mx-auto size-5 text-muted-foreground"
					/>
					<h2 className="mt-3 font-serif text-lg">No highlights found</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Try a different reference or phrase.
					</p>
				</div>
			) : null}
		</section>
	);
}

function HighlightCard({ highlight }: { highlight: SavedHighlightFixture }) {
	const excerpt = getHighlightedExcerpt(
		highlight.text,
		highlight.highlightStart,
		highlight.highlightEnd,
	);
	const colorTreatment = highlightColorTreatment[highlight.color];

	return (
		<article className="rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-[0_2px_8px_color-mix(in_oklab,var(--foreground),transparent_95%)] sm:px-5 sm:py-4">
			<header className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<h2 className="truncate font-serif text-base tracking-[-0.015em] sm:text-lg">
						{highlight.reference}
					</h2>
					<Badge variant="secondary">{highlight.translation}</Badge>
				</div>
				<div className="flex shrink-0 items-center gap-2 text-muted-foreground text-xs">
					<HighlightColorLabel color={highlight.color} />
					<span aria-hidden="true">·</span>
					{highlight.displayDate}
				</div>
			</header>

			<p className="mt-4 font-serif text-[0.98rem] text-foreground leading-7 sm:text-base">
				<span className="mr-3 align-top font-sans text-muted-foreground text-xs leading-7">
					{getVerseNumber(highlight.reference)}
				</span>
				{excerpt.before}
				<mark
					className={cn("rounded-sm px-0.5 text-inherit", colorTreatment.mark)}
				>
					{excerpt.highlighted}
				</mark>
				{excerpt.after}
			</p>

			<footer className="mt-4 flex items-center gap-3 text-muted-foreground text-xs">
				<span className="font-medium text-foreground">
					{highlight.reference}
				</span>
				<span className="ml-auto">No note attached</span>
				<Button
					aria-label={`Options for ${highlight.reference}`}
					className="size-7 rounded-md"
					disabled
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<EllipsisVerticalIcon aria-hidden="true" data-icon="inline-start" />
				</Button>
			</footer>
		</article>
	);
}

function HighlightColorLabel({ color }: { color: HighlightColor }) {
	return (
		<span className="flex items-center gap-1.5">
			<span
				aria-hidden="true"
				className={cn(
					"size-2 rounded-full",
					highlightColorTreatment[color].dot,
				)}
			/>
			{color}
		</span>
	);
}

function getHighlightedExcerpt(text: string, start: number, end: number) {
	const highlightStart = Math.max(0, Math.min(start, text.length));
	const highlightEnd = Math.max(highlightStart, Math.min(end, text.length));

	return {
		after: text.slice(highlightEnd),
		before: text.slice(0, highlightStart),
		highlighted: text.slice(highlightStart, highlightEnd),
	};
}

function getVerseNumber(reference: string) {
	return reference.match(/:(\d+)/)?.[1] ?? "";
}
