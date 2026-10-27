import { Extension } from "@tiptap/core";
import { type EditorState, Plugin, PluginKey } from "@tiptap/pm/state";

import type { EditorCommandId } from "./editor-actions";

export type SlashCommandState = { from: number; query: string } | null;

/**
 * One entry in a host-chosen `/` menu: a command id, optionally with a label
 * and a short hint that fit the host's wording better than the defaults.
 */
export type SlashCommandItem =
	| EditorCommandId
	| { hint?: string; id: EditorCommandId; label?: string };

/**
 * The short `/` menu for prayer journal entries. "Verse" and "Person I'm
 * praying for" only appear when the host supplies their pickers.
 */
export const journalSlashCommands = [
	{ hint: "e.g. John 3:16", id: "verse" },
	"person",
	{ id: "heading2", label: "Heading" },
	"bullet",
] as const satisfies readonly SlashCommandItem[];

export const slashCommandPluginKey = new PluginKey<SlashCommandState>(
	"slashCommands",
);

export const SlashCommands = Extension.create({
	name: "slashCommands",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: slashCommandPluginKey,
				state: {
					init: (): SlashCommandState => null,
					// The fourth argument is the state after this change; the
					// third is the one before it, which left the menu a keystroke
					// behind (typing just "/" never opened it).
					apply: (_transaction, _value, _oldState, state) =>
						getSlashCommandState(state),
				},
			}),
		];
	},
});

export function getSlashCommandState(state: EditorState): SlashCommandState {
	if (!state.selection.empty) return null;
	const { $from, from } = state.selection;
	const textBeforeCursor = $from.parent.textBetween(
		0,
		$from.parentOffset,
		"\0",
		"\0",
	);
	const match = /(?:^|\s)\/([^\s/]*)$/.exec(textBeforeCursor);
	const query = match?.[1];
	if (query === undefined) return null;
	return { from: from - query.length - 1, query };
}

export function getNextCommandIndex(
	currentIndex: number,
	direction: "up" | "down",
	length: number,
) {
	if (!length) return 0;
	return (currentIndex + (direction === "down" ? 1 : -1) + length) % length;
}
