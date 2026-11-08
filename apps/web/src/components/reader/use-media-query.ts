import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept up to date as the window changes size. On
 * the server, and before the page has loaded in the browser, it's false.
 */
export function useMediaQuery(query: string) {
	return useSyncExternalStore(
		(onChange) => {
			if (!window.matchMedia) return () => {};
			const list = window.matchMedia(query);
			list.addEventListener("change", onChange);
			return () => list.removeEventListener("change", onChange);
		},
		() => window.matchMedia?.(query).matches ?? false,
		() => false,
	);
}

/** The study panel docks beside the text from this width (HANDOFF §7). */
export const desktopReaderQuery = "(min-width: 1024px)";
