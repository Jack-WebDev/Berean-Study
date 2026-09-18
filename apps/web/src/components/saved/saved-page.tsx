import type {
	SavedBookmark,
	SavedHighlight,
	SavedItems,
} from "@berean-study/db/saved-items";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";

const savedViews = ["highlights", "bookmarks"] as const;

export type SavedView = (typeof savedViews)[number];

export function SavedPage({
	onViewChange,
	savedItems,
	view,
}: {
	onViewChange: (view: SavedView) => void;
	savedItems: SavedItems;
	view: SavedView;
}) {
	return (
		<div className="min-h-full px-5 py-8 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<header className="flex flex-col gap-4">
					<div>
						<h1 className="font-serif text-3xl tracking-[-0.02em] sm:text-4xl">
							Saved
						</h1>
						<p className="mt-2 text-muted-foreground">
							Your highlights and bookmarks, kept together for study.
						</p>
					</div>
					<ToggleGroup
						aria-label="Saved item view"
						onValueChange={(values) => {
							const nextView = values[0] as SavedView | undefined;
							if (nextView) onViewChange(nextView);
						}}
						spacing={0}
						value={[view]}
						variant="outline"
					>
						{savedViews.map((savedView) => (
							<ToggleGroupItem key={savedView} value={savedView}>
								{toSavedViewLabel(savedView)}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</header>
				{view === "highlights" ? (
					<HighlightsView highlights={savedItems.highlights} />
				) : (
					<BookmarksView bookmarks={savedItems.bookmarks} />
				)}
			</main>
		</div>
	);
}

function HighlightsView({
	highlights,
}: {
	highlights: readonly SavedHighlight[];
}) {
	if (highlights.length === 0) {
		return (
			<SavedEmptyState
				description="Highlights you make while reading Scripture will appear here."
				title="No highlights yet"
			/>
		);
	}

	return (
		<ul className="border-y">
			{highlights.map((highlight) => (
				<li
					className="border-border border-b px-5 py-4 last:border-b-0"
					key={highlight.id}
				>
					<p className="font-medium text-sm">
						{formatHighlightReference(highlight)}
					</p>
					<p className="mt-1 line-clamp-2 text-muted-foreground text-sm leading-6">
						“{getHighlightExcerpt(highlight)}”
					</p>
				</li>
			))}
		</ul>
	);
}

function BookmarksView({ bookmarks }: { bookmarks: readonly SavedBookmark[] }) {
	if (bookmarks.length === 0) {
		return (
			<SavedEmptyState
				description="Passages you bookmark while studying Scripture will appear here."
				title="No bookmarks yet"
			/>
		);
	}

	return (
		<ul className="border-y">
			{bookmarks.map((bookmark) => (
				<li
					className="border-border border-b px-5 py-4 font-medium text-sm last:border-b-0"
					key={bookmark.passageId}
				>
					{bookmark.label}
				</li>
			))}
		</ul>
	);
}

function SavedEmptyState({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<Empty className="min-h-64">
			<EmptyHeader>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function formatHighlightReference(highlight: SavedHighlight) {
	return `${highlight.bookName} ${highlight.chapterNumber}:${highlight.verseNumber} · ${highlight.translationAbbreviation}`;
}

function getHighlightExcerpt(highlight: SavedHighlight) {
	const excerpt = highlight.text.slice(
		highlight.startOffset,
		highlight.endOffset,
	);

	return excerpt || highlight.text;
}

function toSavedViewLabel(view: SavedView) {
	return view === "highlights" ? "Highlights" : "Bookmarks";
}
