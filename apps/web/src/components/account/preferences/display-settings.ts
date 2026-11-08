import {
	readingTextSizeFromOldSetting,
	readingTextSizes,
} from "@berean-study/db/reader-catalogue";

import type { ReadingWidth, TextSize, Theme } from "./types";

const STORAGE_KEY = "berean-study.display-preferences.v1";

export const displaySettingsInitializer = `(() => {
	try {
		const value = JSON.parse(localStorage.getItem("${STORAGE_KEY}") || "{}");
		const theme = ["light", "dark", "system"].includes(value.theme)
			? value.theme
			: "light";
		const oldSizes = ${JSON.stringify(readingTextSizeFromOldSetting)};
		const textSize = ${JSON.stringify(readingTextSizes)}.includes(value.textSize)
			? value.textSize
			: oldSizes[value.textSize] || "large";
		const readingWidth = ["narrow", "default", "wide"].includes(value.readingWidth)
			? value.readingWidth
			: "default";
		const isDark =
			theme === "dark" ||
			(theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
		const root = document.documentElement;
		root.classList.toggle("dark", isDark);
		const favicon = document.getElementById("favicon");
		if (favicon instanceof HTMLLinkElement) {
			favicon.href = isDark ? "/favicon-dark.png" : "/favicon.png";
		}
		root.dataset.theme = theme;
		root.dataset.textSize = textSize;
		root.dataset.readingWidth = readingWidth;
	} catch {}
})();`;

export type DisplaySettings = {
	theme: Theme;
	textSize: TextSize;
	readingWidth: ReadingWidth;
};

export const defaultDisplaySettings: DisplaySettings = {
	theme: "light",
	textSize: "large",
	readingWidth: "default",
};

function syncFavicon(isDark: boolean) {
	const favicon = document.getElementById("favicon");
	if (favicon instanceof HTMLLinkElement) {
		favicon.href = isDark ? "/favicon-dark.png" : "/favicon.png";
	}
}

const themes = new Set<Theme>(["light", "dark", "system"]);
const textSizes = new Set<string>(readingTextSizes);

/** A size saved before there were four keeps about the same size. */
function readTextSize(value: unknown): TextSize {
	if (typeof value !== "string") return defaultDisplaySettings.textSize;
	if (textSizes.has(value)) return value as TextSize;
	if (value in readingTextSizeFromOldSetting) {
		return readingTextSizeFromOldSetting[
			value as keyof typeof readingTextSizeFromOldSetting
		];
	}
	return defaultDisplaySettings.textSize;
}
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
			textSize: readTextSize(settings.textSize),
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
	syncFavicon(isDark);
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
