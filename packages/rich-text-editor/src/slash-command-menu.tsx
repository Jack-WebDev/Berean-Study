import { useEffect, useMemo, useState } from "react";

import {
	createEditorCommandCatalog,
	type EditorCommand,
	type EditorCommandContext,
	filterEditorCommands,
} from "./editor-actions";
import { type EditorSession, useSlashCommandState } from "./editor-session";
import { getNextCommandIndex } from "./slash-commands";

export function SlashCommandMenu({
	session,
	onRequestBibleReference,
	onRequestCitation,
	preset,
}: { session: EditorSession } & EditorCommandContext) {
	const context = useMemo(
		() => ({ onRequestBibleReference, onRequestCitation, preset }),
		[onRequestBibleReference, onRequestCitation, preset],
	);
	const slashState = useSlashCommandState(session);
	const catalog = useMemo(() => createEditorCommandCatalog(context), [context]);
	const commands = useMemo(
		() => filterEditorCommands(catalog.commands(), slashState?.query ?? ""),
		[catalog, slashState?.query],
	);
	const [selection, setSelection] = useState({ index: 0, query: "" });
	const query = slashState?.query ?? "";
	const selectedIndex = selection.query === query ? selection.index : 0;
	const position = slashState
		? session.getSlashMenuPosition(slashState.from)
		: undefined;

	useEffect(() => {
		if (!slashState) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				setSelection((currentSelection) => ({
					index: getNextCommandIndex(
						currentSelection.query === query ? currentSelection.index : 0,
						event.key === "ArrowDown" ? "down" : "up",
						commands.length,
					),
					query,
				}));
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				session.clearSlashCommand(slashState.from);
				return;
			}
			if (event.key === "Enter" && commands[selectedIndex]) {
				event.preventDefault();
				void executeSlashAction(
					session,
					commands[selectedIndex],
					slashState.from,
				);
			}
		};
		return session.registerKeyDownListener(handleKeyDown);
	}, [commands, query, selectedIndex, session, slashState]);

	if (!slashState || !commands.length) return null;

	return (
		<div
			aria-label="Slash commands"
			className="fixed z-50 w-64 overflow-hidden rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
			role="listbox"
			style={position}
		>
			<div className="px-2 py-1.5 text-muted-foreground text-xs">
				{query
					? `Commands matching “${query}”`
					: "Start with a writing command"}
			</div>
			{commands.map((command, index) => (
				<button
					aria-selected={index === selectedIndex}
					className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted aria-selected:bg-muted"
					key={command.id}
					onMouseEnter={() => setSelection({ index, query })}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() =>
						void executeSlashAction(session, command, slashState.from)
					}
					role="option"
					type="button"
				>
					<span className="mr-2 text-muted-foreground">/{command.id}</span>
					{command.label}
				</button>
			))}
		</div>
	);
}

async function executeSlashAction(
	session: EditorSession,
	command: EditorCommand,
	from: number,
) {
	session.clearSlashCommand(from);
	return command.execute(session);
}
