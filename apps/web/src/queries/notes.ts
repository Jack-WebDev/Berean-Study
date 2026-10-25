import { type QueryClient, queryOptions } from "@tanstack/react-query";

import {
	countNotesForPassage,
	countNoteViews,
	getNote,
	listNoteBooks,
	listNotes,
	listNoteTags,
	listNoteVersions,
} from "@/functions/notes";

import {
	collectionKeys,
	libraryKeys,
	type NoteCountFilters,
	type NoteListFilters,
	noteKeys,
} from "./keys";

export type { NoteCountFilters, NoteListFilters } from "./keys";

export const notesQueryOptions = (filters: NoteListFilters = {}) =>
	queryOptions({
		queryKey: noteKeys.list(filters),
		queryFn: () => listNotes({ data: filters }),
	});

export const noteViewCountsQueryOptions = (filters: NoteCountFilters = {}) =>
	queryOptions({
		queryKey: noteKeys.viewCounts(filters),
		queryFn: () => countNoteViews({ data: filters }),
	});

export const noteVersionsQueryOptions = (id: number) =>
	queryOptions({
		queryKey: noteKeys.versions(id),
		queryFn: () => listNoteVersions({ data: { id } }),
	});

export const noteQueryOptions = (id: number) =>
	queryOptions({
		queryKey: noteKeys.detail(id),
		queryFn: () => getNote({ data: { id } }),
	});

export const noteBooksQueryOptions = () =>
	queryOptions({
		queryKey: noteKeys.books(),
		queryFn: () => listNoteBooks(),
	});

export const noteTagsQueryOptions = () =>
	queryOptions({
		queryKey: noteKeys.tags(),
		queryFn: () => listNoteTags(),
	});

export const passageNoteCountQueryOptions = (passageId: number) =>
	queryOptions({
		queryKey: noteKeys.passageCount(passageId),
		queryFn: () => countNotesForPassage({ data: { passageId } }),
	});

/** Everything a note's content, tags, passages or membership can change. */
export function invalidateNoteQueries(
	queryClient: QueryClient,
	{ refetchType }: { refetchType?: "active" | "none" } = {},
) {
	return Promise.all(
		[noteKeys.all, collectionKeys.all, libraryKeys.all].map((queryKey) =>
			queryClient.invalidateQueries({
				queryKey,
				refetchType,
			}),
		),
	);
}
