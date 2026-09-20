import { Tabs, TabsList, TabsTrigger } from "@berean-study/ui/components/tabs";
import { BookmarkIcon, BookOpenIcon, HighlighterIcon } from "lucide-react";

export type SavedView = "bookmarks" | "highlights";

export function SavedHeader({
	onViewChange,
	view,
}: {
	onViewChange: (view: SavedView) => void;
	view: SavedView;
}) {
	return (
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
					<TabsList className="h-10 gap-2 bg-transparent p-0" variant="line">
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
							<HighlighterIcon aria-hidden="true" data-icon="inline-start" />
							Highlights
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
			<SavedExplainer />
		</header>
	);
}

function SavedExplainer() {
	return (
		<aside className="flex gap-3 rounded-xl border border-border/75 bg-secondary/35 p-3.5">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[oklch(0.62_0.12_85)]">
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
					className="mt-2 inline-flex items-center gap-1 font-medium text-[0.7rem] text-[oklch(0.62_0.12_85)]"
					type="button"
				>
					Learn more <span aria-hidden="true">→</span>
				</button>
			</div>
		</aside>
	);
}
