import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BookmarksView } from "./bookmarks-view";
import { HighlightsContent } from "./highlights-content";
import type { BookmarkItem, SavedHighlightFixture } from "./saved-fixtures";
import { SavedHeader, type SavedView } from "./saved-header";

export type { SavedView } from "./saved-header";

export function SavedPage({
	onViewChange,
	view,
}: {
	onViewChange: (view: SavedView) => void;
	view: SavedView;
}) {
	const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
	const [highlights, setHighlights] = useState<SavedHighlightFixture[]>([]);

	useEffect(() => {
		if (!import.meta.env.DEV) return;

		let isCurrent = true;
		void import("./saved-fixtures").then(({ savedFixtures }) => {
			if (!isCurrent) return;

			setBookmarks([...savedFixtures.bookmarks]);
			setHighlights([...savedFixtures.highlights]);
		});

		return () => {
			isCurrent = false;
		};
	}, []);

	const removeBookmark = (bookmark: BookmarkItem) => {
		setBookmarks((current) =>
			current.filter((item) => item.id !== bookmark.id),
		);
		toast("Bookmark removed", {
			action: {
				label: "Undo",
				onClick: () => {
					setBookmarks((current) =>
						current.some((item) => item.id === bookmark.id)
							? current
							: [...current, bookmark],
					);
				},
			},
		});
	};

	return (
		<div className="min-h-full px-5 py-7 sm:px-8 sm:py-9 lg:px-12">
			<main className="mx-auto flex w-full max-w-6xl flex-col gap-5">
				<SavedHeader onViewChange={onViewChange} view={view} />
				{view === "bookmarks" ? (
					<BookmarksView bookmarks={bookmarks} onRemove={removeBookmark} />
				) : (
					<HighlightsContent highlights={highlights} />
				)}
			</main>
		</div>
	);
}
