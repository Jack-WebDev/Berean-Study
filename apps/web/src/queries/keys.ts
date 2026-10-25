import type { getCommunityFeed } from "@/functions/community";
import type { listNotes } from "@/functions/notes";
import type { getNotificationPage } from "@/functions/notifications";
import type { getVerseRangeText } from "@/functions/passages";
import type { listLibraryReflections } from "@/functions/prayers";

/*
 * Query keys for every server resource, kept apart from the query functions so
 * mutations can invalidate any domain without importing its server functions.
 */

type ServerFnData<TFn extends (...args: never[]) => unknown> =
	NonNullable<Parameters<TFn>[0]> extends { data: infer TData } ? TData : never;

export type NoteListFilters = ServerFnData<typeof listNotes>;
export type VerseRange = ServerFnData<typeof getVerseRangeText>;
export type LibraryReflectionFilters = ServerFnData<
	typeof listLibraryReflections
>;
export type NotificationPageParams = ServerFnData<typeof getNotificationPage>;
export type CommunityFeedParams = ServerFnData<typeof getCommunityFeed>;

export const noteKeys = {
	all: ["notes"] as const,
	lists: () => [...noteKeys.all, "list"] as const,
	list: (filters: NoteListFilters) => [...noteKeys.lists(), filters] as const,
	detail: (id: number) => [...noteKeys.all, "detail", id] as const,
	books: () => [...noteKeys.all, "books"] as const,
	tags: () => [...noteKeys.all, "tags"] as const,
	passageCount: (passageId: number) =>
		[...noteKeys.all, "passage-count", passageId] as const,
};

export const passageKeys = {
	all: ["passages"] as const,
	options: () => [...passageKeys.all, "options"] as const,
	studyContext: (passageId: number) =>
		[...passageKeys.all, "study-context", passageId] as const,
	text: (passageId: number, translationId?: number) =>
		[...passageKeys.all, "text", { passageId, translationId }] as const,
	verseRange: (range: VerseRange) =>
		[...passageKeys.all, "verse-range", range] as const,
	translations: () => [...passageKeys.all, "translations"] as const,
	preferredTranslation: () =>
		[...passageKeys.all, "preferred-translation"] as const,
	recent: () => [...passageKeys.all, "recent"] as const,
};

export const collectionKeys = {
	all: ["collections"] as const,
	list: () => [...collectionKeys.all, "list"] as const,
	forNotes: () => [...collectionKeys.all, "for-notes"] as const,
	detail: (id: number) => [...collectionKeys.all, "detail", id] as const,
	forNote: (noteId: number) =>
		[...collectionKeys.all, "for-note", noteId] as const,
	forPassage: (passageId: number) =>
		[...collectionKeys.all, "for-passage", passageId] as const,
};

export const prayerKeys = {
	all: ["prayers"] as const,
	list: () => [...prayerKeys.all, "list"] as const,
	detail: (id: number) => [...prayerKeys.all, "detail", id] as const,
	reflection: (prayerId: number, reflectionId: number) =>
		[...prayerKeys.detail(prayerId), "reflection", reflectionId] as const,
	libraryReflections: (filters: LibraryReflectionFilters) =>
		[...prayerKeys.all, "library-reflections", filters] as const,
};

export const testimonyKeys = {
	all: ["testimonies"] as const,
	list: () => [...testimonyKeys.all, "list"] as const,
	detail: (id: number) => [...testimonyKeys.all, "detail", id] as const,
};

export const notificationKeys = {
	all: ["notifications"] as const,
	recent: () => [...notificationKeys.all, "recent"] as const,
	pages: () => [...notificationKeys.all, "page"] as const,
	page: (params: NotificationPageParams) =>
		[...notificationKeys.pages(), params] as const,
};

export const accountKeys = {
	all: ["account"] as const,
	sessions: () => [...accountKeys.all, "sessions"] as const,
};

export const notificationPreferenceKeys = {
	all: ["notification-preferences"] as const,
};

export const communityKeys = {
	all: ["community"] as const,
	feeds: () => [...communityKeys.all, "feed"] as const,
	feed: (params: CommunityFeedParams) =>
		[...communityKeys.feeds(), params] as const,
	saved: (limit: number) => [...communityKeys.all, "saved", limit] as const,
	publishingResources: () =>
		[...communityKeys.all, "publishing-resources"] as const,
};

// The library overview, home and saved items summarise every other domain, so
// their keys sit under one root that any library mutation can invalidate.
export const libraryKeys = {
	all: ["library"] as const,
	home: () => [...libraryKeys.all, "home"] as const,
	continueReading: () => [...libraryKeys.all, "continue-reading"] as const,
	destinationCounts: () => [...libraryKeys.all, "destination-counts"] as const,
	recentActivity: () => [...libraryKeys.all, "recent-activity"] as const,
	recentlyStudied: () => [...libraryKeys.all, "recently-studied"] as const,
	savedItems: () => [...libraryKeys.all, "saved-items"] as const,
};
