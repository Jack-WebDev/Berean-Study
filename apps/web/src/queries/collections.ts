import {
	type QueryClient,
	type QueryKey,
	queryOptions,
} from "@tanstack/react-query";

import {
	getCollectionDetail,
	getCollectionLibrary,
	listCollectionsForNote,
	listCollectionsForNotes,
	listCollectionsForPassage,
} from "@/functions/collections";

import { collectionKeys, communityKeys, libraryKeys } from "./keys";

/** Every collection's card, plus the study project to continue. */
export const collectionLibraryQueryOptions = () =>
	queryOptions({
		queryKey: collectionKeys.list(),
		queryFn: () => getCollectionLibrary(),
	});

export const collectionsForNotesQueryOptions = () =>
	queryOptions({
		queryKey: collectionKeys.forNotes(),
		queryFn: () => listCollectionsForNotes(),
	});

export const collectionDetailQueryOptions = (id: number) =>
	queryOptions({
		queryKey: collectionKeys.detail(id),
		queryFn: () => getCollectionDetail({ data: { id } }),
	});

export const noteCollectionsQueryOptions = (noteId: number) =>
	queryOptions({
		queryKey: collectionKeys.forNote(noteId),
		queryFn: () => listCollectionsForNote({ data: { id: noteId } }),
	});

export const passageCollectionsQueryOptions = (passageId: number) =>
	queryOptions({
		queryKey: collectionKeys.forPassage(passageId),
		queryFn: () => listCollectionsForPassage({ data: { id: passageId } }),
	});

/**
 * A collection, or what's in it, changed. That shows on the collection pages, in
 * the Library (cards, counts and "Continue studying") and in Community's list of
 * things to share. Pass anything else the same write changed, such as note lists.
 */
export function invalidateCollections(
	queryClient: QueryClient,
	...alsoChanged: QueryKey[]
) {
	return Promise.all(
		[
			collectionKeys.all,
			libraryKeys.all,
			communityKeys.publishingResources(),
			...alsoChanged,
		].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
	);
}
