import type { SavedCommunityPost } from "@berean-study/db/community";
import type {
	SavedBookmark,
	SavedHighlight,
	SavedItems,
} from "@berean-study/db/saved-items";
import type { SavedItemRemoval } from "@/functions/saved-items";

export type SavedLibraryBookmark =
	| {
			identity: Extract<SavedItemRemoval, { kind: "scripture" }>;
			item: SavedBookmark;
			kind: "scripture";
	  }
	| {
			identity: Extract<SavedItemRemoval, { kind: "community" }>;
			item: SavedCommunityPost;
			kind: "community";
	  };

export type SavedLibraryHighlight = {
	identity: Extract<SavedItemRemoval, { kind: "highlight" }>;
	item: SavedHighlight;
	kind: "highlight";
};

export type SavedLibrary = {
	bookmarks: SavedLibraryBookmark[];
	highlights: SavedLibraryHighlight[];
};

/** Combines the authenticated member's saved material for the Saved library. */
export function createSavedLibrary(
	savedItems: SavedItems,
	communityBookmarks: readonly SavedCommunityPost[],
): SavedLibrary {
	return {
		bookmarks: [
			...savedItems.bookmarks.map(toSavedScriptureBookmark),
			...communityBookmarks.map(toSavedCommunityBookmark),
		],
		highlights: savedItems.highlights.map(toSavedHighlight),
	};
}

function toSavedScriptureBookmark(
	item: SavedBookmark,
): Extract<SavedLibraryBookmark, { kind: "scripture" }> {
	return {
		identity: { kind: "scripture", passageId: item.passageId },
		item,
		kind: "scripture",
	};
}

function toSavedCommunityBookmark(
	item: SavedCommunityPost,
): Extract<SavedLibraryBookmark, { kind: "community" }> {
	return {
		identity: { kind: "community", postId: item.id },
		item,
		kind: "community",
	};
}

function toSavedHighlight(item: SavedHighlight): SavedLibraryHighlight {
	return {
		identity: { highlightId: item.id, kind: "highlight" },
		item,
		kind: "highlight",
	};
}
