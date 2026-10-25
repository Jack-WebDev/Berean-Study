import { Extension } from "@tiptap/core";
import { type EditorState, Plugin, PluginKey } from "@tiptap/pm/state";

/** The "@reference" being typed, from the "@" up to the cursor. */
export type PassageMentionState = { from: number; query: string } | null;

type PluginState = {
	/** Where the member pressed Escape, so that mention stays closed. */
	dismissedFrom: number | null;
	mention: PassageMentionState;
};

export const passageMentionPluginKey = new PluginKey<PluginState>(
	"passageMentions",
);

/** Longest reference worth searching for, e.g. "1 Corinthians 13:4–7". */
const MAX_QUERY_LENGTH = 30;

/**
 * Tracks "@" followed by a reference, such as "@acts 17:11", so a menu can
 * offer matching passages. Choosing one replaces the text with a reference.
 */
export const PassageMentions = Extension.create({
	name: "passageMentions",

	addProseMirrorPlugins() {
		return [
			new Plugin<PluginState>({
				key: passageMentionPluginKey,
				state: {
					init: () => ({ dismissedFrom: null, mention: null }),
					apply: (transaction, value, _oldState, state) => {
						const mention = getPassageMentionState(state);
						const dismissed = transaction.getMeta(passageMentionPluginKey)
							?.dismiss
							? (mention?.from ?? null)
							: value.dismissedFrom === null
								? null
								: transaction.mapping.map(value.dismissedFrom);
						if (mention && mention.from === dismissed)
							return { dismissedFrom: dismissed, mention: null };
						return { dismissedFrom: mention ? null : dismissed, mention };
					},
				},
			}),
		];
	},
});

export function getPassageMentionState(
	state: EditorState,
): PassageMentionState {
	if (!state.selection.empty) return null;
	const { $from, from } = state.selection;
	if ($from.parent.type.spec.code) return null;
	const textBeforeCursor = $from.parent.textBetween(
		0,
		$from.parentOffset,
		"\0",
		"\0",
	);
	// A reference starts right after "@" and may hold single spaces, digits,
	// colons and dashes; a double space or another "@" ends it.
	const match = /(?:^|\s)@([^\s@\0](?:[^\s@\0]| (?! ))*)?$/u.exec(
		textBeforeCursor,
	);
	const query = match?.[1] ?? "";
	if (!match || query.length > MAX_QUERY_LENGTH) return null;
	return { from: from - query.length - 1, query };
}
