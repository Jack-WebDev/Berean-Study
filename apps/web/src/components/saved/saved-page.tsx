import type {
	SavedItemRemoval,
	SavedLibrary,
	SavedLibraryBookmark,
	SavedLibraryHighlight,
} from "@berean-study/db/saved-items";
import { toast } from "sonner";
import { BookmarksView } from "./bookmarks-view";
import { HighlightsContent } from "./highlights-content";
import { SavedHeader, type SavedView } from "./saved-header";

export type { SavedItemRemoval } from "@berean-study/db/saved-items";
export type { SavedView } from "./saved-header";

export function SavedPage({
	library,
	onRemove,
	onViewChange,
	view,
}: {
	library: SavedLibrary;
	onRemove: (item: SavedItemRemoval) => Promise<void>;
	onViewChange: (view: SavedView) => void;
	view: SavedView;
}) {
	const removeBookmark = async (bookmark: SavedLibraryBookmark) => {
		await handleRemoval(onRemove, bookmark.identity, "Bookmark removed");
	};
	const removeHighlight = async (highlight: SavedLibraryHighlight) => {
		await handleRemoval(onRemove, highlight.identity, "Highlight removed");
	};

	return (
		<div className="min-h-full px-5 py-7 sm:px-8 sm:py-9 lg:px-12">
			<main className="mx-auto flex w-full max-w-6xl flex-col gap-5">
				<SavedHeader onViewChange={onViewChange} view={view} />
				{view === "bookmarks" ? (
					<BookmarksView
						bookmarks={library.bookmarks}
						onRemove={removeBookmark}
					/>
				) : (
					<HighlightsContent
						highlights={library.highlights}
						onRemove={removeHighlight}
					/>
				)}
			</main>
		</div>
	);
}

async function handleRemoval(
	onRemove: (item: SavedItemRemoval) => Promise<void>,
	item: SavedItemRemoval,
	successMessage: string,
) {
	try {
		await onRemove(item);
		toast.success(successMessage);
	} catch {
		toast.error("We couldn't remove this saved item. Please try again.");
	}
}
