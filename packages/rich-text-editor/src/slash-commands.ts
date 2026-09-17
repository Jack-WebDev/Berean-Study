import { Extension } from "@tiptap/core";
import { type EditorState, Plugin, PluginKey } from "@tiptap/pm/state";

export type SlashCommandState = { from: number; query: string } | null;

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
					apply: (_transaction, _value, state) => getSlashCommandState(state),
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
