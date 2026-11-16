import { useEffect } from "react";

/**
 * Asks the browser to warn before the tab is closed or reloaded while there's
 * unsaved work. Links inside the app can wait for a save; closing the tab can't.
 */
export function useUnsavedWarning(hasUnsavedWork: boolean) {
	useEffect(() => {
		if (!hasUnsavedWork) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [hasUnsavedWork]);
}
