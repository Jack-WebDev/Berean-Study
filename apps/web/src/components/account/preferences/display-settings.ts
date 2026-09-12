import type { ReadingWidth, TextSize, Theme } from "./types";

const STORAGE_KEY = "berean-study.display-preferences.v1";

export type DisplaySettings = {
	theme: Theme;
	textSize: TextSize;
	readingWidth: ReadingWidth;
};

export const defaultDisplaySettings: DisplaySettings = {
	theme: "light",
	textSize: "default",
	readingWidth: "default",
};

const themes = new Set<Theme>(["light", "dark", "system"]);
const textSizes = new Set<TextSize>(["small", "default", "large"]);
const readingWidths = new Set<ReadingWidth>(["narrow", "default", "wide"]);

export function readDisplaySettings(): DisplaySettings {
	if (typeof window === "undefined") return defaultDisplaySettings;

	try {
		const value: unknown = JSON.parse(
			window.localStorage.getItem(STORAGE_KEY) ?? "{}",
		);
		if (!value || typeof value !== "object") return defaultDisplaySettings;

		const settings = value as Partial<DisplaySettings>;
		return {
			theme:
				settings.theme && themes.has(settings.theme)
					? settings.theme
					: defaultDisplaySettings.theme,
			textSize:
				settings.textSize && textSizes.has(settings.textSize)
					? settings.textSize
					: defaultDisplaySettings.textSize,
			readingWidth:
				settings.readingWidth && readingWidths.has(settings.readingWidth)
					? settings.readingWidth
					: defaultDisplaySettings.readingWidth,
		};
	} catch {
		return defaultDisplaySettings;
	}
}

export function applyDisplaySettings(settings: DisplaySettings) {
	if (typeof window === "undefined") return;

	const root = document.documentElement;
	const isDark =
		settings.theme === "dark" ||
		(settings.theme === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);

	root.classList.toggle("dark", isDark);
	root.dataset.theme = settings.theme;
	root.dataset.textSize = settings.textSize;
	root.dataset.readingWidth = settings.readingWidth;
}

export function saveDisplaySettings(settings: DisplaySettings) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// The display preference still works if browser storage is unavailable.
	}
}
