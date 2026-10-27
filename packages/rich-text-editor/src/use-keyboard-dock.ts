import { type RefObject, useEffect, useState } from "react";

/**
 * On phones the on-screen keyboard covers the bottom of the page. While the
 * editor has focus and the keyboard is open, this pins the toolbar to the top
 * of the keyboard so formatting stays within reach.
 */
export function useKeyboardDock(
	ref: RefObject<HTMLDivElement | null>,
	enabled: boolean,
) {
	const [top, setTop] = useState<number | null>(null);

	useEffect(() => {
		const viewport = window.visualViewport;
		if (!enabled || !viewport) return;
		const isTouch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
		if (!isTouch) return;
		const update = () => {
			const toolbar = ref.current;
			const editorRoot =
				toolbar?.closest("[data-rich-text-editor]") ?? toolbar?.parentElement;
			const keyboardOpen = viewport.height < window.innerHeight - 120;
			const hasFocus = Boolean(
				editorRoot?.contains(document.activeElement) &&
					document.activeElement !== toolbar,
			);
			setTop(
				toolbar && keyboardOpen && hasFocus
					? viewport.offsetTop + viewport.height - toolbar.offsetHeight
					: null,
			);
		};
		viewport.addEventListener("resize", update);
		viewport.addEventListener("scroll", update);
		document.addEventListener("focusin", update);
		document.addEventListener("focusout", update);
		return () => {
			viewport.removeEventListener("resize", update);
			viewport.removeEventListener("scroll", update);
			document.removeEventListener("focusin", update);
			document.removeEventListener("focusout", update);
		};
	}, [enabled, ref]);

	return top === null
		? { isDocked: false, style: undefined }
		: { isDocked: true, style: { top } };
}
