import type { ReadingPreferences } from "@berean-study/db/reader-catalogue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import {
	applyDisplaySettings,
	type DisplaySettings,
	readDisplaySettings,
	saveDisplaySettings,
} from "@/components/account/preferences/display-settings";
import { saveReadingPreferences } from "@/functions/reader";
import { readerKeys } from "@/queries/keys";
import {
	invalidateReader,
	readingPreferencesQueryOptions,
} from "@/queries/reader";

/*
 * Reading settings are saved to the member's account, so they follow them to any
 * device. The page colour, text size and line length are also kept in this
 * browser, because a small script applies them before the page draws. Without
 * that copy, the page would flash light, then turn dark.
 */

export type ReadingPreferenceChanges = NonNullable<
	Parameters<typeof saveReadingPreferences>[0]
>["data"];

function displayChanges(
	changes: ReadingPreferenceChanges,
): Partial<DisplaySettings> {
	return {
		...(changes.pageColour ? { theme: changes.pageColour } : {}),
		...(changes.textSize ? { textSize: changes.textSize } : {}),
		...(changes.lineLength ? { readingWidth: changes.lineLength } : {}),
	};
}

/** Changes reading settings. The page updates at once; saving happens behind. */
export function useChangeReadingPreferences() {
	const queryClient = useQueryClient();
	const queryKey = readerKeys.preferences();
	const { mutate } = useMutation({
		mutationFn: (changes: ReadingPreferenceChanges) =>
			saveReadingPreferences({ data: changes }),
		onSuccess: (saved, changes) => {
			queryClient.setQueryData(queryKey, saved);
			// A different tradition or translation changes which books and text show.
			if (changes.traditionSlug || changes.translationAbbreviation) {
				void invalidateReader(queryClient);
			}
		},
	});

	return useCallback(
		(changes: ReadingPreferenceChanges) => {
			// The screen changes first, in the same moment as the tap; saving follows.
			const display = displayChanges(changes);
			if (Object.keys(display).length > 0) {
				const settings = { ...readDisplaySettings(), ...display };
				applyDisplaySettings(settings);
				saveDisplaySettings(settings);
			}
			const previous = queryClient.getQueryData<ReadingPreferences>(queryKey);
			if (previous) {
				// Stops a slower load of the old settings from undoing this change.
				void queryClient.cancelQueries({ queryKey });
				queryClient.setQueryData<ReadingPreferences>(queryKey, {
					...previous,
					...changes,
				});
			}
			mutate(changes, {
				onError: () => {
					if (previous) queryClient.setQueryData(queryKey, previous);
				},
			});
		},
		[mutate, queryClient, queryKey],
	);
}

const syncedKey = "berean-study.display-preferences.saved-to-account";

function hasCopiedToAccount() {
	try {
		return window.localStorage.getItem(syncedKey) === "yes";
	} catch {
		return true;
	}
}

function rememberCopiedToAccount() {
	try {
		window.localStorage.setItem(syncedKey, "yes");
	} catch {
		// Without browser storage the account copy is simply used each time.
	}
}

/**
 * Keeps this browser's display settings in step with the account. The first time,
 * this browser's settings are copied to the account, so nobody's colours change
 * when this starts. After that, the account wins, so a change made on another
 * device shows up here.
 */
export function useDisplaySettingsSync() {
	const { data } = useQuery(readingPreferencesQueryOptions());
	const change = useChangeReadingPreferences();

	useEffect(() => {
		if (!data) return;
		const local = readDisplaySettings();
		const fromAccount: DisplaySettings = {
			readingWidth: data.lineLength,
			textSize: data.textSize,
			theme: data.pageColour,
		};
		const same =
			local.theme === fromAccount.theme &&
			local.textSize === fromAccount.textSize &&
			local.readingWidth === fromAccount.readingWidth;

		if (!hasCopiedToAccount()) {
			rememberCopiedToAccount();
			if (!same) {
				change({
					lineLength: local.readingWidth,
					pageColour: local.theme,
					textSize: local.textSize,
				});
			}
			return;
		}
		if (!same) {
			applyDisplaySettings(fromAccount);
			saveDisplaySettings(fromAccount);
		}
	}, [change, data]);
}
