import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
	addPassageToCollection,
	arrangeCollectionPassages,
	createCollectionSection,
	deleteCollectionSection,
	type getCollectionDetail,
	markCollectionOpened,
	moveCollectionSection,
	removePassageFromCollection,
	renameCollectionSection,
	setCollectionPassageRead,
	setCollectionPinned,
} from "@/functions/collections";
import { collectionKeys, libraryKeys } from "@/queries/keys";

export type CollectionDetail = NonNullable<
	Awaited<ReturnType<typeof getCollectionDetail>>
>;
export type CollectionPassage = CollectionDetail["passages"][number];
export type CollectionSection = CollectionDetail["sections"][number];
export type CollectionNote = CollectionDetail["notes"][number];
export type PassageGroup = { passageIds: number[]; sectionId: number | null };

/**
 * The detail page's writes. Each refreshes the collection and the library
 * (cards, counts and "Continue studying") once it lands.
 */
export function useCollectionActions(collectionId: number) {
	const queryClient = useQueryClient();
	const detailKey = collectionKeys.detail(collectionId);
	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
			queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
		]);
	const failed = (message: string) => () => toast.error(message);

	const markOpened = useMutation({
		mutationFn: () => markCollectionOpened({ data: { id: collectionId } }),
		// Only the library's "Continue studying" depends on this.
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: collectionKeys.list() }),
	});

	const setPinned = useMutation({
		mutationFn: (pinned: boolean) =>
			setCollectionPinned({ data: { id: collectionId, pinned } }),
		onError: failed("We couldn't update this collection."),
		onSuccess: refresh,
	});

	const setRead = useMutation({
		mutationFn: (input: { passageId: number; read: boolean }) =>
			setCollectionPassageRead({ data: { ...input, id: collectionId } }),
		onError: failed("We couldn't update this passage. Please try again."),
		onSuccess: refresh,
	});

	const addPassage = useMutation({
		mutationFn: (input: { passageId: number; sectionId: number | null }) =>
			addPassageToCollection({ data: { ...input, id: collectionId } }),
		onSuccess: refresh,
	});

	const removePassage = useMutation({
		mutationFn: (passageId: number) =>
			removePassageFromCollection({ data: { id: collectionId, passageId } }),
		onError: failed("We couldn't remove this passage. Please try again."),
		onSuccess: refresh,
	});

	/** Shows the new order straight away and puts it back if saving fails. */
	const arrange = useMutation({
		mutationFn: (groups: PassageGroup[]) =>
			arrangeCollectionPassages({ data: { groups, id: collectionId } }),
		onMutate: async (groups) => {
			await queryClient.cancelQueries({ queryKey: detailKey });
			const previous = queryClient.getQueryData<CollectionDetail>(detailKey);
			if (previous) {
				queryClient.setQueryData<CollectionDetail>(detailKey, {
					...previous,
					passages: applyGroups(previous.passages, groups),
				});
			}
			return { previous };
		},
		onError: (_error, _groups, context) => {
			if (context?.previous) {
				queryClient.setQueryData(detailKey, context.previous);
			}
			toast.error("We couldn't save the new order. Please try again.");
		},
		onSettled: refresh,
	});

	const createSection = useMutation({
		mutationFn: (title: string) =>
			createCollectionSection({ data: { id: collectionId, title } }),
		onSuccess: refresh,
	});

	const renameSection = useMutation({
		mutationFn: (input: { sectionId: number; title: string }) =>
			renameCollectionSection({ data: { ...input, id: collectionId } }),
		onSuccess: refresh,
	});

	const moveSection = useMutation({
		mutationFn: (input: { sectionId: number; toIndex: number }) =>
			moveCollectionSection({ data: { ...input, id: collectionId } }),
		onError: failed("We couldn't move this section. Please try again."),
		onSuccess: refresh,
	});

	const deleteSection = useMutation({
		mutationFn: (sectionId: number) =>
			deleteCollectionSection({ data: { id: collectionId, sectionId } }),
		onError: failed("We couldn't delete this section. Please try again."),
		onSuccess: refresh,
	});

	return {
		addPassage,
		arrange,
		createSection,
		deleteSection,
		markOpened,
		moveSection,
		removePassage,
		renameSection,
		setPinned,
		setRead,
	};
}

/** Reorders passages (and their sections) to match `groups`. */
export function applyGroups(
	passages: readonly CollectionPassage[],
	groups: readonly PassageGroup[],
) {
	const byId = new Map(passages.map((passage) => [passage.passageId, passage]));
	return groups.flatMap((group) =>
		group.passageIds.flatMap((passageId) => {
			const passage = byId.get(passageId);
			return passage ? [{ ...passage, sectionId: group.sectionId }] : [];
		}),
	);
}
