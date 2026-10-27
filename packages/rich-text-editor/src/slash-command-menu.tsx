import { useEffect, useMemo, useState } from "react";

import {
	createEditorCommandCatalog,
	type EditorCommand,
	type EditorCommandContext,
	filterEditorCommands,
} from "./editor-actions";
import {
	type SlashCommandSession,
	useSlashCommandState,
} from "./editor-session";
import { getNextCommandIndex, type SlashCommandItem } from "./slash-commands";

type SlashCommand = EditorCommand & { hint?: string };

export function SlashCommandMenu({
	items,
	session,
	onRequestBibleReference,
	onRequestCitation,
	onRequestPerson,
	onRequestVerse,
	preset,
}: {
	/** Limits and orders the menu; every available command when omitted. */
	items?: readonly SlashCommandItem[];
	session: SlashCommandSession;
} & EditorCommandContext) {
	const context = useMemo(
		() => ({
			onRequestBibleReference,
			onRequestCitation,
			onRequestPerson,
			onRequestVerse,
			preset,
		}),
		[
			onRequestBibleReference,
			onRequestCitation,
			onRequestPerson,
			onRequestVerse,
			preset,
		],
	);
	const slashState = useSlashCommandState(session);
	const catalog = useMemo(() => createEditorCommandCatalog(context), [context]);
	const menuCommands = useMemo(
		() => selectSlashCommands(catalog.commands(), items),
		[catalog, items],
	);
	const commands = useMemo(
		() => filterEditorCommands(menuCommands, slashState?.query ?? ""),
		[menuCommands, slashState?.query],
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
			className="fixed z-50 w-64 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
			role="listbox"
			style={position}
		>
			<div className="px-2 py-1.5 text-muted-foreground text-xs">
				{query ? `Commands matching “${query}”` : "Insert"}
			</div>
			{commands.map((command, index) => (
				<button
					aria-selected={index === selectedIndex}
					className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted aria-selected:bg-muted"
					key={command.id}
					onMouseEnter={() => setSelection({ index, query })}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() =>
						void executeSlashAction(session, command, slashState.from)
					}
					role="option"
					type="button"
				>
					{command.label}
					{command.hint ? (
						<span className="ml-auto text-muted-foreground text-xs">
							{command.hint}
						</span>
					) : null}
				</button>
			))}
		</div>
	);
}

/** Applies a host's menu choice: its order, its labels, and only its commands. */
export function selectSlashCommands(
	available: readonly EditorCommand[],
	items: readonly SlashCommandItem[] | undefined,
): SlashCommand[] {
	if (!items) return [...available];
	return items.flatMap((item) => {
		const { hint, id, label }: Exclude<SlashCommandItem, string> =
			typeof item === "string" ? { id: item } : item;
		const command = available.find((candidate) => candidate.id === id);
		return command ? [{ ...command, hint, label: label ?? command.label }] : [];
	});
}

async function executeSlashAction(
	session: SlashCommandSession,
	command: EditorCommand,
	from: number,
) {
	session.clearSlashCommand(from);
	return command.execute(session);
}
