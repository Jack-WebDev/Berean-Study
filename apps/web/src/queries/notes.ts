import { type QueryClient, queryOptions } from "@tanstack/react-query";

import {
	countNotesForPassage,
	getNote,
	listNoteBooks,
	listNotes,
	listNoteTags,
} from "@/functions/notes";

import {
	collectionKeys,
	libraryKeys,
	type NoteListFilters,
	noteKeys,
} from "./keys";

export type { NoteListFilters } from "./keys";

export const notesQueryOptions = (filters: NoteListFilters = {}) =>
	queryOptions({
		queryKey: noteKeys.list(filters),
		queryFn: () => listNotes({ data: filters }),
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
