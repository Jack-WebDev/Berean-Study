import type { SavedHighlight } from "@berean-study/db/saved-items";
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
import { cn } from "@berean-study/ui/lib/utils";
import {
	EllipsisVerticalIcon,
	Grid2X2Icon,
	HighlighterIcon,
	LayoutListIcon,
	SearchIcon,
} from "lucide-react";
import { useState } from "react";

export function HighlightsContent({
	highlights,
	onRemove,
}: {
	highlights: readonly SavedHighlight[];
	onRemove: (highlight: SavedHighlight) => Promise<void>;
}) {
	const [book, setBook] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("list");
	const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
	const books = [...new Set(highlights.map((highlight) => highlight.bookName))];
	const visibleHighlights = highlights.filter(
		(highlight) =>
			(book === "all" || highlight.bookName === book) &&
			[
				highlight.bookName,
				highlight.chapterNumber,
				highlight.verseNumber,
				highlight.text,
				highlight.translationAbbreviation,
			]
				.join(" ")
				.toLocaleLowerCase()
				.includes(normalizedQuery),
	);

	return (
		<section
			aria-label="Saved Scripture highlights"
			className="flex flex-col gap-4"
		>
			{highlights.length === 0 ? (
				<HighlightsEmptyState />
			) : (
				<HighlightsList
					book={book}
					books={books}
					highlights={visibleHighlights}
					onBookChange={setBook}
					onRemove={onRemove}
					onSearchQueryChange={setSearchQuery}
					onViewModeChange={setViewMode}
					searchQuery={searchQuery}
					viewMode={viewMode}
				/>
			)}
		</section>
	);
}

function HighlightsEmptyState() {
	return (
		<Empty className="min-h-64 rounded-xl border border-border/70 bg-card py-12">
			<EmptyHeader>
				<EmptyTitle className="font-serif text-lg">
					No highlights yet
				</EmptyTitle>
				<EmptyDescription className="max-w-64 text-sm">
					Scripture text you highlight while studying will appear here.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function HighlightsList({
	book,
	books,
	highlights,
	onBookChange,
	onRemove,
	onSearchQueryChange,
	onViewModeChange,
	searchQuery,
	viewMode,
}: {
	book: string;
	books: readonly string[];
	highlights: readonly SavedHighlight[];
	onBookChange: (book: string) => void;
	onRemove: (highlight: SavedHighlight) => Promise<void>;
	onSearchQueryChange: (query: string) => void;
	onViewModeChange: (viewMode: "grid" | "list") => void;
	searchQuery: string;
	viewMode: "grid" | "list";
}) {
	return (
		<>
			<div className="flex min-w-0 flex-col gap-2 sm:flex-row">
				<label className="min-w-0 flex-1" htmlFor="highlight-search">
					<span className="sr-only">Search your highlights</span>
					<InputGroup className="h-9 rounded-lg border-border/70 bg-card">
						<InputGroupAddon align="inline-start">
							<SearchIcon aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							id="highlight-search"
							onChange={(event) => onSearchQueryChange(event.target.value)}
							placeholder="Search your highlights..."
							type="search"
							value={searchQuery}
						/>
					</InputGroup>
				</label>
				<label className="w-full sm:w-40" htmlFor="highlight-book">
					<span className="sr-only">Filter by book</span>
					<NativeSelect
						className="w-full **:data-[slot=native-select]:rounded-lg **:data-[slot=native-select]:border-border/70 **:data-[slot=native-select]:bg-card"
						id="highlight-book"
						onChange={(event) => onBookChange(event.target.value)}
						value={book}
					>
						<NativeSelectOption value="all">All Books</NativeSelectOption>
						{books.map((bookName) => (
							<NativeSelectOption key={bookName} value={bookName}>
								{bookName}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</label>
				<ToggleGroup
					aria-label="Highlight layout"
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

			<p aria-live="polite" className="text-muted-foreground text-sm">
				{highlights.length} highlight{highlights.length === 1 ? "" : "s"}
			</p>

			{highlights.length === 0 ? (
				<NoHighlightsFound />
			) : (
				<ul
					className={cn(
						"gap-2",
						viewMode === "grid" ? "grid sm:grid-cols-2" : "flex flex-col",
					)}
				>
					{highlights.map((highlight) => (
						<li key={highlight.id}>
							<HighlightCard highlight={highlight} onRemove={onRemove} />
						</li>
					))}
				</ul>
			)}
		</>
	);
}

function NoHighlightsFound() {
	return (
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
	);
}

function HighlightCard({
	highlight,
	onRemove,
}: {
	highlight: SavedHighlight;
	onRemove: (highlight: SavedHighlight) => Promise<void>;
}) {
	const excerpt = getHighlightedExcerpt(
		highlight.text,
		highlight.startOffset,
		highlight.endOffset,
	);
	const reference = `${highlight.bookName} ${highlight.chapterNumber}:${highlight.verseNumber}`;

	return (
		<article className="rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-[0_2px_8px_color-mix(in_oklab,var(--foreground),transparent_95%)] sm:px-5 sm:py-4">
			<header className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<h2 className="truncate font-serif text-base tracking-[-0.015em] sm:text-lg">
						{reference}
					</h2>
					<Badge variant="secondary">{highlight.translationAbbreviation}</Badge>
				</div>
			</header>
			<p className="mt-4 font-serif text-[0.98rem] text-foreground leading-7 sm:text-base">
				<span className="mr-3 align-top font-sans text-muted-foreground text-xs leading-7">
					{highlight.verseNumber}
				</span>
				{excerpt.before}
				<mark className="rounded-sm bg-accent/25 px-0.5 text-inherit">
					{excerpt.highlighted}
				</mark>
				{excerpt.after}
			</p>
			<footer className="mt-4 flex items-center gap-3 text-muted-foreground text-xs">
				<span className="font-medium text-foreground">{reference}</span>
				<HighlightMenu
					highlight={highlight}
					onRemove={onRemove}
					reference={reference}
				/>
			</footer>
		</article>
	);
}

function HighlightMenu({
	highlight,
	onRemove,
	reference,
}: {
	highlight: SavedHighlight;
	onRemove: (highlight: SavedHighlight) => Promise<void>;
	reference: string;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={`Options for ${reference}`}
						className="ml-auto size-7 rounded-md"
						size="icon-sm"
						type="button"
						variant="ghost"
					/>
				}
			>
				<EllipsisVerticalIcon aria-hidden="true" data-icon="inline-start" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40 rounded-lg p-1">
				<DropdownMenuGroup>
					<DropdownMenuItem
						onClick={() => void onRemove(highlight)}
						variant="destructive"
					>
						Remove highlight
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
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
