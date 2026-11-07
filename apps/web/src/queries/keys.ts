import type { listAuditEntries } from "@/functions/audit";
import type { getCommunityFeed } from "@/functions/community";
import type { countNoteViews, listNotes } from "@/functions/notes";
import type { getNotificationPage } from "@/functions/notifications";
import type { getVerseRangeText } from "@/functions/passages";
import type { listPeople } from "@/functions/people";
import type { listReflections } from "@/functions/reflections";
import type { getBookStructure } from "@/functions/scripture-data";
import type { getVerseHandling } from "@/functions/structure";
import type {
	getEntryChapter,
	getVerseAcrossTranslations,
} from "@/functions/verse-entry";
import type { getProofreadingChapter } from "@/functions/verse-proofreading";

/*
 * Query keys for every server resource, kept apart from the query functions so
 * mutations can invalidate any domain without importing its server functions.
 */

type ServerFnData<TFn extends (...args: never[]) => unknown> =
	NonNullable<Parameters<TFn>[0]> extends { data: infer TData } ? TData : never;

export type BookStructureInput = ServerFnData<typeof getBookStructure>;
export type EntryChapterInput = ServerFnData<typeof getEntryChapter>;
export type ProofreadingChapterInput = ServerFnData<
	typeof getProofreadingChapter
>;
export type VerseAcrossTranslationsInput = ServerFnData<
	typeof getVerseAcrossTranslations
>;
export type VerseHandlingInput = ServerFnData<typeof getVerseHandling>;
export type PeopleListFilters = ServerFnData<typeof listPeople>;
export type AuditListFilters = ServerFnData<typeof listAuditEntries>;
export type NoteListFilters = ServerFnData<typeof listNotes>;
export type NoteCountFilters = ServerFnData<typeof countNoteViews>;
export type VerseRange = ServerFnData<typeof getVerseRangeText>;
export type ReflectionFilters = ServerFnData<typeof listReflections>;
export type NotificationPageParams = ServerFnData<typeof getNotificationPage>;
export type CommunityFeedParams = ServerFnData<typeof getCommunityFeed>;

export const noteKeys = {
	all: ["notes"] as const,
	lists: () => [...noteKeys.all, "list"] as const,
	list: (filters: NoteListFilters) => [...noteKeys.lists(), filters] as const,
	viewCounts: (filters: NoteCountFilters) =>
		[...noteKeys.all, "view-counts", filters] as const,
	detail: (id: number) => [...noteKeys.all, "detail", id] as const,
	versions: (id: number) => [...noteKeys.detail(id), "versions"] as const,
	books: () => [...noteKeys.all, "books"] as const,
	tags: () => [...noteKeys.all, "tags"] as const,
	passageCount: (passageId: number) =>
		[...noteKeys.all, "passage-count", passageId] as const,
};

export const staffQueueKeys = {
	all: ["staff-queues"] as const,
	counts: () => [...staffQueueKeys.all, "counts"] as const,
};

export const peopleKeys = {
	all: ["people"] as const,
	list: (filters: PeopleListFilters) =>
		[...peopleKeys.all, "list", filters] as const,
	profile: (userId: string) => [...peopleKeys.all, "profile", userId] as const,
	assignableRoles: () => [...peopleKeys.all, "assignable-roles"] as const,
	pendingChanges: () => [...peopleKeys.all, "pending-changes"] as const,
};

export const roleKeys = {
	all: ["roles"] as const,
	matrix: () => [...roleKeys.all, "matrix"] as const,
};

export const auditKeys = {
	all: ["audit"] as const,
	list: (filters: AuditListFilters) =>
		[...auditKeys.all, "list", filters] as const,
};

export const scriptureDataKeys = {
	all: ["scripture-data"] as const,
	books: () => [...scriptureDataKeys.all, "books"] as const,
	book: (slug: string) => [...scriptureDataKeys.all, "book", slug] as const,
	structure: (input: BookStructureInput) =>
		[...scriptureDataKeys.all, "structure", input] as const,
	translations: (abbreviation?: string) =>
		[...scriptureDataKeys.all, "translations", { abbreviation }] as const,
};

export const verseTextKeys = {
	all: ["verse-text"] as const,
	entry: (input: EntryChapterInput) =>
		[...verseTextKeys.all, "entry", input] as const,
	proofreading: (input: ProofreadingChapterInput) =>
		[...verseTextKeys.all, "proofreading", input] as const,
	queue: () => [...verseTextKeys.all, "queue"] as const,
	readyToPublish: () => [...verseTextKeys.all, "ready-to-publish"] as const,
	verse: (input: VerseAcrossTranslationsInput) =>
		[...verseTextKeys.all, "verse", input] as const,
};

export const foundationKeys = {
	all: ["foundations"] as const,
	canon: (slug?: string) => [...foundationKeys.all, "canon", { slug }] as const,
	structureChanges: () => [...foundationKeys.all, "structure-changes"] as const,
	structureChange: (id: number) =>
		[...foundationKeys.all, "structure-change", id] as const,
	verseHandling: (input: VerseHandlingInput) =>
		[...foundationKeys.all, "verse-handling", input] as const,
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
	readyForReflection: () =>
		[...prayerKeys.all, "ready-for-reflection"] as const,
};

export const reflectionKeys = {
	all: ["reflections"] as const,
	list: (filters: ReflectionFilters) =>
		[...reflectionKeys.all, "list", filters] as const,
	detail: (id: number) => [...reflectionKeys.all, "detail", id] as const,
};

// Tab counts and settings that span prayers, testimonies and reflections.
export const prayerJournalKeys = {
	all: ["prayer-journal"] as const,
	counts: () => [...prayerJournalKeys.all, "counts"] as const,
	reflectionReminder: () =>
		[...prayerJournalKeys.all, "reflection-reminder"] as const,
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
