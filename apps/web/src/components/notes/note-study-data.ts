import { useEffect, useRef, useState } from "react";

import { listNotes, listNoteTags } from "@/functions/notes";
import {
	getPassageOptions,
	getPassageStudyContext,
	getPassageText,
	getPreferredTranslation,
	listRecentPassages,
	listTranslations,
} from "@/functions/passages";

export type PassageOption = Awaited<
	ReturnType<typeof getPassageOptions>
>[number];
export type PassageText = NonNullable<
	Awaited<ReturnType<typeof getPassageText>>
>;
export type Translation = Awaited<ReturnType<typeof listTranslations>>[number];

export type AsyncValue<T> =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "failed" }
	| { status: "ready"; value: T };

/**
 * Loads a value whenever `key` changes and ignores responses for stale keys.
 * A null key means there is nothing to load yet.
 */
function useAsyncValue<T>(
	key: string | null,
	load: () => Promise<T>,
): AsyncValue<T> {
	const loadRef = useRef(load);
	loadRef.current = load;
	const [state, setState] = useState<{ key: string | null } & AsyncValue<T>>({
		key: null,
		status: "idle",
	});

	useEffect(() => {
		if (key === null) return;
		let active = true;
		setState({ key, status: "loading" });
		loadRef
			.current()
			.then((value) => {
				if (active) setState({ key, status: "ready", value });
			})
			.catch(() => {
				if (active) setState({ key, status: "failed" });
			});
		return () => {
			active = false;
		};
	}, [key]);

	if (key === null) return { status: "idle" };
	return state.key === key ? state : { status: "loading" };
}

export function usePassageOptions() {
	return useAsyncValue("passages", () => getPassageOptions());
}

export function useTranslations() {
	return useAsyncValue("translations", () => listTranslations());
}

export function usePreferredTranslation() {
	return useAsyncValue("preferred-translation", () =>
		getPreferredTranslation(),
	);
}

export function useRecentPassages() {
	return useAsyncValue("recent", () => listRecentPassages());
}

export function useNoteTagSuggestions() {
	return useAsyncValue("tags", () => listNoteTags());
}

/** Passage text in a translation; the member's preferred one when unset. */
export function usePassageText(
	passageId: number | null,
	translationId: number | null,
) {
	return useAsyncValue(
		passageId ? `${passageId}:${translationId ?? "preferred"}` : null,
		() =>
			getPassageText({
				data: {
					passageId: passageId ?? 0,
					translationId: translationId ?? undefined,
				},
			}),
	);
}

export function useRelatedPassages(passageId: number | null) {
	return useAsyncValue(passageId ? String(passageId) : null, async () => {
		const context = await getPassageStudyContext({
			data: { passageId: passageId ?? 0 },
		});
		return context?.relatedPassages ?? [];
	});
}

export function useNotesForPassage(passageId: number | null) {
	return useAsyncValue(passageId ? String(passageId) : null, () =>
		listNotes({ data: { passageId: passageId ?? 0, sort: "updated-desc" } }),
	);
}

/** Case-insensitive match on every word of the query, capped for display. */
export function filterPassageOptions(
	passages: readonly PassageOption[],
	query: string,
	limit = 8,
) {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return [];
	return passages
		.filter((passage) => {
			const label = passage.label.toLowerCase();
			return words.every((word) => label.includes(word));
		})
		.slice(0, limit);
}
