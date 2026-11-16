import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type RefObject, useEffect } from "react";

import { recordChapterVisit, saveReadingPlace } from "@/functions/reader";
import { invalidateReadingPlace } from "@/queries/reader";

import { createPlaceSaver } from "./place-saver";

/**
 * The verse at the top of the reading area: the first one whose bottom edge is
 * below the sticky header.
 */
function verseAtTop(list: HTMLElement, headerBottom: number) {
	for (const element of list.querySelectorAll<HTMLElement>("[data-verse]")) {
		if (element.getBoundingClientRect().bottom > headerBottom + 8) {
			return Number(element.dataset.verse);
		}
	}
	return null;
}

/**
 * Remembers where the member is reading, so the Bible opens there next time
 * (HANDOFF Screen 1, "Remembering the place"). Saves shortly after scrolling
 * stops, and straight away when they switch apps, close the tab or leave the
 * chapter. Also adds the chapter to their reading history once per visit.
 */
export function useReadingPlace({
	bookSlug,
	chapter,
	enabled,
	headerRef,
	listRef,
	translationAbbreviation,
}: {
	bookSlug: string;
	chapter: number;
	/** Off for chapters that aren't published, so they're never saved as a place. */
	enabled: boolean;
	headerRef: RefObject<HTMLElement | null>;
	listRef: RefObject<HTMLElement | null>;
	translationAbbreviation: string;
}) {
	const queryClient = useQueryClient();
	const { mutate: savePlace } = useMutation({
		mutationFn: (verse: number) =>
			saveReadingPlace({
				data: { bookSlug, chapter, translationAbbreviation, verse },
			}),
		// Marked out of date without refetching now; they refresh when next shown.
		onSuccess: () =>
			invalidateReadingPlace(queryClient, { refetchType: "none" }),
	});
	const { mutate: recordVisit } = useMutation({
		mutationFn: () => recordChapterVisit({ data: { bookSlug, chapter } }),
		onSuccess: () =>
			invalidateReadingPlace(queryClient, { refetchType: "none" }),
	});

	useEffect(() => {
		if (!enabled) return;
		recordVisit();

		const saver = createPlaceSaver({
			measure: () => {
				const list = listRef.current;
				if (!list) return null;
				// On short screens the header scrolls away, so never measure above the screen.
				const headerBottom = Math.max(
					0,
					headerRef.current?.getBoundingClientRect().bottom ?? 0,
				);
				return verseAtTop(list, headerBottom);
			},
			save: savePlace,
		});

		// Noted while scrolling, at most once a frame, because by the time the
		// reader leaves the chapter its verses are already off the page.
		let frame: number | undefined;
		const onScroll = () => {
			if (frame === undefined) {
				frame = window.requestAnimationFrame(() => {
					frame = undefined;
					saver.noteVerse();
				});
			}
			saver.saveSoon();
		};
		const saveIfLeaving = () => {
			if (document.visibilityState === "hidden") saver.saveNow();
		};

		// Opening a chapter counts as being there, once the page has settled.
		saver.saveSoon();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("pagehide", saver.saveNow);
		document.addEventListener("visibilitychange", saveIfLeaving);
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("pagehide", saver.saveNow);
			document.removeEventListener("visibilitychange", saveIfLeaving);
			if (frame !== undefined) window.cancelAnimationFrame(frame);
			saver.saveNow();
		};
	}, [enabled, headerRef, listRef, recordVisit, savePlace]);
}
