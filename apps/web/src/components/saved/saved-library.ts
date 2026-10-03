import type { SavedCommunityPost } from "@berean-study/db/community";
import type {
	SavedBookmark,
	SavedHighlight,
	SavedItems,
} from "@berean-study/db/saved-items";

export type SavedLibraryBookmark =
	| {
			item: SavedBookmark;
			kind: "scripture";
	  }
	| {
			item: SavedCommunityPost;
			kind: "community";
	  };

export type SavedLibrary = {
	bookmarks: SavedLibraryBookmark[];
	highlights: SavedHighlight[];
};

/** Combines the authenticated member's saved material for the Saved library. */
export function createSavedLibrary(
	savedItems: SavedItems,
	communityBookmarks: readonly SavedCommunityPost[],
): SavedLibrary {
	return {
		bookmarks: [
			...savedItems.bookmarks.map((item) => ({
				item,
				kind: "scripture" as const,
			})),
			...communityBookmarks.map((item) => ({
				item,
				kind: "community" as const,
			})),
		],
		highlights: savedItems.highlights,
	};
}
