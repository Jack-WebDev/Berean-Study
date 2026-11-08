import { selectionLabel } from "@berean-study/db/reader-catalogue";
import { useQueryClient } from "@tanstack/react-query";

import { useReaderToast } from "@/components/reader-ui/reader-toast";
import {
	addVersesToCollection,
	removeVersesFromCollection,
	saveVerses,
	setVersesHighlighted,
	undoHighlightChange,
	unsaveVerses,
} from "@/functions/reader";
import { collectionKeys, libraryKeys, readerKeys } from "@/queries/keys";

type ChapterMarks = Awaited<
	ReturnType<typeof import("@/functions/reader").getChapterMarks>
>;

export type ChosenVerses = {
	bookName: string;
	bookSlug: string;
	chapter: number;
	translationAbbreviation: string;
	/** Every verse of the chapter, to copy the chosen ones' words. */
	verseTexts: ReadonlyMap<number, string>;
	verses: number[];
};

const tryAgain = "Check your connection, then try again.";

/** The chosen verses as text to paste elsewhere, ending with where they're from. */
export function copiedText(chosen: ChosenVerses) {
	const words = chosen.verses
		.map((verse) => {
			const text = (chosen.verseTexts.get(verse) ?? "").replace(
				/\s*\n\s*/g,
				" ",
			);
			return chosen.verses.length > 1 ? `${verse} ${text}` : text;
		})
		.join(" ");
	const reference = selectionLabel(
		chosen.bookName,
		chosen.chapter,
		chosen.verses,
	);
	return `“${words}” ${reference} (${chosen.translationAbbreviation})`;
}

/**
 * Highlight, Save, Add to collection and Copy (HANDOFF Screen 2). Each happens
 * straight away and says so in a short message. Highlight, Save and Add to
 * collection offer Undo instead of asking "Are you sure?".
 */
export function useVerseActions() {
	const queryClient = useQueryClient();
	const toast = useReaderToast();

	const refreshMarks = () =>
		queryClient.invalidateQueries({ queryKey: readerKeys.allMarks() });

	function highlight(chosen: ChosenVerses, highlighted: boolean) {
		const reference = selectionLabel(
			chosen.bookName,
			chosen.chapter,
			chosen.verses,
		);
		const input = {
			bookSlug: chosen.bookSlug,
			chapter: chosen.chapter,
			translationAbbreviation: chosen.translationAbbreviation,
			verses: chosen.verses,
		};
		const marksKey = readerKeys.marks({
			bookSlug: chosen.bookSlug,
			chapter: chosen.chapter,
			translationAbbreviation: chosen.translationAbbreviation,
		});

		// Show the change straight away; the server catches up.
		const before = queryClient.getQueryData<ChapterMarks>(marksKey);
		if (before) {
			const next = new Set(before.highlighted);
			for (const verse of chosen.verses) {
				if (highlighted) next.add(verse);
				else next.delete(verse);
			}
			queryClient.setQueryData<ChapterMarks>(marksKey, {
				...before,
				highlighted: [...next].sort((a, b) => a - b),
			});
		}

		setVersesHighlighted({ data: { ...input, highlighted } }).then(
			({ undo }) => {
				void refreshMarks();
				void queryClient.invalidateQueries({ queryKey: libraryKeys.all });
				toast.show(
					highlighted
						? `Highlighted ${reference}`
						: `Highlight removed from ${reference}`,
					{
						undo: () => {
							if (before) queryClient.setQueryData(marksKey, before);
							undoHighlightChange({ data: undo })
								.catch(() => toast.show(`We couldn't undo that. ${tryAgain}`))
								.finally(() => void refreshMarks());
						},
					},
				);
			},
			() => {
				if (before) queryClient.setQueryData(marksKey, before);
				toast.show(
					`We couldn't ${highlighted ? "highlight" : "remove the highlight from"} ${reference}. ${tryAgain}`,
				);
			},
		);
	}

	function save(chosen: ChosenVerses) {
		const reference = selectionLabel(
			chosen.bookName,
			chosen.chapter,
			chosen.verses,
		);
		saveVerses({
			data: {
				bookSlug: chosen.bookSlug,
				chapter: chosen.chapter,
				translationAbbreviation: chosen.translationAbbreviation,
				verses: chosen.verses,
			},
		}).then(
			({ addedPassageIds }) => {
				void queryClient.invalidateQueries({ queryKey: libraryKeys.all });
				if (addedPassageIds.length === 0) {
					toast.show(`${reference} is already in your Saved verses`);
					return;
				}
				toast.show(`Saved ${reference} to your Saved verses`, {
					undo: () =>
						unsaveVerses({ data: { passageIds: addedPassageIds } })
							.catch(() => toast.show(`We couldn't undo that. ${tryAgain}`))
							.finally(
								() =>
									void queryClient.invalidateQueries({
										queryKey: libraryKeys.all,
									}),
							),
				});
			},
			() => toast.show(`We couldn't save ${reference}. ${tryAgain}`),
		);
	}

	function addToCollection(
		chosen: ChosenVerses,
		collection: { id: number; name: string },
	) {
		const reference = selectionLabel(
			chosen.bookName,
			chosen.chapter,
			chosen.verses,
		);
		const refreshCollections = () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
				queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
			]);
		addVersesToCollection({
			data: {
				bookSlug: chosen.bookSlug,
				chapter: chosen.chapter,
				collectionId: collection.id,
				translationAbbreviation: chosen.translationAbbreviation,
				verses: chosen.verses,
			},
		}).then(
			({ addedPassageIds, collectionName }) => {
				void refreshCollections();
				if (addedPassageIds.length === 0) {
					toast.show(`${reference} is already in “${collectionName}”`);
					return;
				}
				toast.show(`Added ${reference} to “${collectionName}”`, {
					undo: () =>
						removeVersesFromCollection({
							data: {
								collectionId: collection.id,
								passageIds: addedPassageIds,
							},
						})
							.catch(() => toast.show(`We couldn't undo that. ${tryAgain}`))
							.finally(() => void refreshCollections()),
				});
			},
			() =>
				toast.show(
					`We couldn't add ${reference} to “${collection.name}”. ${tryAgain}`,
				),
		);
	}

	function copy(chosen: ChosenVerses) {
		const reference = selectionLabel(
			chosen.bookName,
			chosen.chapter,
			chosen.verses,
		);
		const done = () =>
			toast.show(`Copied ${reference} (${chosen.translationAbbreviation})`);
		const failed = () =>
			toast.show(
				"We couldn't copy those verses. Try again, or select the words and copy them.",
			);
		if (!navigator.clipboard) {
			failed();
			return;
		}
		navigator.clipboard.writeText(copiedText(chosen)).then(done, failed);
	}

	return { addToCollection, copy, highlight, save };
}
