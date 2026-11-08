import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type RefObject, useEffect, useRef } from "react";

import { recordChapterVisit, saveReadingPlace } from "@/functions/reader";
import { libraryKeys, readerKeys } from "@/queries/keys";

/** Wait this long after scrolling stops before saving, so a quick flick isn't saved. */
const saveDelayMs = 1500;

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
		onSuccess: () => {
			// Mark them out of date without refetching now; they refresh when next shown.
			void queryClient.invalidateQueries({
				queryKey: readerKeys.place(),
				refetchType: "none",
			});
			void queryClient.invalidateQueries({ queryKey: libraryKeys.all });
		},
	});
	const { mutate: recordVisit } = useMutation({
		mutationFn: () => recordChapterVisit({ data: { bookSlug, chapter } }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: readerKeys.recentChapters() }),
	});

	const lastSaved = useRef<number | null>(null);

	useEffect(() => {
		if (!enabled) return;
		recordVisit();

		// Noted while scrolling, at most once a frame, because by the time the
		// reader leaves the chapter its verses are already off the page.
		let verseInView: number | null = null;
		let frame: number | undefined;
		let timer: number | undefined;
		const noteVerseInView = () => {
			const list = listRef.current;
			if (!list) return;
			// On short screens the header scrolls away, so never measure above the screen.
			const headerBottom = Math.max(
				0,
				headerRef.current?.getBoundingClientRect().bottom ?? 0,
			);
			verseInView = verseAtTop(list, headerBottom) ?? verseInView;
		};
		const saveNow = () => {
			window.clearTimeout(timer);
			timer = undefined;
			if (verseInView === null || verseInView === lastSaved.current) return;
			lastSaved.current = verseInView;
			savePlace(verseInView);
		};
		const onScroll = () => {
			if (frame === undefined) {
				frame = window.requestAnimationFrame(() => {
					frame = undefined;
					noteVerseInView();
				});
			}
			window.clearTimeout(timer);
			timer = window.setTimeout(saveNow, saveDelayMs);
		};
		const saveIfLeaving = () => {
			if (document.visibilityState === "hidden") saveNow();
		};

		// Opening a chapter counts as being there, once the page has settled.
		timer = window.setTimeout(() => {
			noteVerseInView();
			saveNow();
		}, saveDelayMs);
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("pagehide", saveNow);
		document.addEventListener("visibilitychange", saveIfLeaving);
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("pagehide", saveNow);
			document.removeEventListener("visibilitychange", saveIfLeaving);
			if (frame !== undefined) window.cancelAnimationFrame(frame);
			saveNow();
		};
	}, [enabled, headerRef, listRef, recordVisit, savePlace]);
}
