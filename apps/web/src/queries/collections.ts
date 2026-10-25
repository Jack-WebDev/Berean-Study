import { queryOptions } from "@tanstack/react-query";

import {
	getCollectionDetail,
	listCollections,
	listCollectionsForNote,
	listCollectionsForNotes,
	listCollectionsForPassage,
} from "@/functions/collections";

import { collectionKeys } from "./keys";

export const collectionsQueryOptions = () =>
	queryOptions({
		queryKey: collectionKeys.list(),
		queryFn: () => listCollections(),
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
