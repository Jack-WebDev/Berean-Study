import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";

import {
	type EditorActionContext,
	executeEditorAction,
	filterEditorActions,
	getAvailableEditorActions,
} from "./editor-actions";
import {
	getNextCommandIndex,
	type SlashCommandState,
	slashCommandPluginKey,
} from "./slash-commands";

export function SlashCommandMenu({
	editor,
	onRequestBibleReference,
	onRequestCitation,
	preset,
}: { editor: Editor } & EditorActionContext) {
	const context = useMemo(
		() => ({ onRequestBibleReference, onRequestCitation, preset }),
		[onRequestBibleReference, onRequestCitation, preset],
	);
	const slashState = useEditorState({
		editor,
		selector: ({ editor: currentEditor }) =>
			slashCommandPluginKey.getState(currentEditor.state) as SlashCommandState,
	});
	const actions = useMemo(
		() =>
			filterEditorActions(
				getAvailableEditorActions(context),
				slashState?.query ?? "",
			),
		[context, slashState?.query],
	);
	const [selection, setSelection] = useState({ index: 0, query: "" });
	const query = slashState?.query ?? "";
	const selectedIndex = selection.query === query ? selection.index : 0;

	useEffect(() => {
		if (!slashState) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				setSelection((currentSelection) => ({
					index: getNextCommandIndex(
						currentSelection.query === query ? currentSelection.index : 0,
						event.key === "ArrowDown" ? "down" : "up",
						actions.length,
					),
					query,
				}));
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				editor.commands.deleteRange({
					from: slashState.from,
					to: editor.state.selection.from,
				});
				return;
			}
			if (event.key === "Enter" && actions[selectedIndex]) {
				event.preventDefault();
				void executeSlashAction(
					editor,
					actions[selectedIndex].id,
					slashState.from,
					context,
				);
			}
		};
		editor.view.dom.addEventListener("keydown", handleKeyDown, true);
		return () =>
			editor.view.dom.removeEventListener("keydown", handleKeyDown, true);
	}, [actions, context, editor, query, selectedIndex, slashState]);

	if (!slashState || !actions.length) return null;

	return (
		<div
			aria-label="Slash commands"
			className="absolute z-20 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
			role="listbox"
		>
			{actions.map((action, index) => (
				<button
					aria-selected={index === selectedIndex}
					className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted aria-selected:bg-muted"
					key={action.id}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() =>
						void executeSlashAction(editor, action.id, slashState.from, context)
					}
					role="option"
					type="button"
				>
					<span className="mr-2 text-muted-foreground">/{action.id}</span>
					{action.label}
				</button>
			))}
		</div>
	);
}

async function executeSlashAction(
	editor: Editor,
	actionId: Parameters<typeof executeEditorAction>[1],
	from: number,
	context: EditorActionContext,
) {
	editor.commands.deleteRange({ from, to: editor.state.selection.from });
	return executeEditorAction(editor, actionId, context);
}
