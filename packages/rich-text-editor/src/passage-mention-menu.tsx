import { BookOpenIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
	type PassageMentionSession,
	usePassageMentionState,
} from "./editor-session";
import { getNextCommandIndex } from "./slash-commands";
import type { BibleReferenceAttributes, PassageMentionSource } from "./types";

/**
 * The menu under "@reference": matching passages from the host, chosen with
 * the arrow keys and Enter or Tab. Escape closes it and keeps the text.
 */
export function PassageMentionMenu({
	session,
	source,
}: {
	session: PassageMentionSession;
	source: PassageMentionSource;
}) {
	const mention = usePassageMentionState(session);
	const query = mention?.query.trim() ?? "";
	const passages = useMemo(
		() => (query ? source.search(query) : []),
		[query, source],
	);
	const [selection, setSelection] = useState({ index: 0, query: "" });
	const selectedIndex = selection.query === query ? selection.index : 0;
	const position = mention
		? session.getSlashMenuPosition(mention.from)
		: undefined;

	useEffect(() => {
		if (!mention || !passages.length) return;
		const choose = (passage: BibleReferenceAttributes) => {
			if (session.completePassageMention(mention.from, passage))
				source.onLink(passage);
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				setSelection((current) => ({
					index: getNextCommandIndex(
						current.query === query ? current.index : 0,
						event.key === "ArrowDown" ? "down" : "up",
						passages.length,
					),
					query,
				}));
			} else if (event.key === "Escape") {
				event.preventDefault();
				session.dismissPassageMention();
			} else if (event.key === "Enter" || event.key === "Tab") {
				const passage = passages[selectedIndex];
				if (!passage) return;
				event.preventDefault();
				choose(passage);
			}
		};
		return session.registerKeyDownListener(handleKeyDown);
	}, [mention, passages, query, selectedIndex, session, source]);

	if (!mention || !passages.length) return null;

	return (
		<div
			aria-label="Link a passage"
			className="fixed z-50 w-72 overflow-hidden rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
			role="listbox"
			style={position}
		>
			<div className="px-2 py-1.5 text-muted-foreground text-xs">
				Link a passage
			</div>
			{passages.map((passage, index) => (
				<button
					aria-selected={index === selectedIndex}
					className="flex min-h-9 w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted aria-selected:bg-muted"
					key={passage.passageId}
					onClick={() => {
						if (session.completePassageMention(mention.from, passage))
							source.onLink(passage);
					}}
					onMouseDown={(event) => event.preventDefault()}
					onMouseEnter={() => setSelection({ index, query })}
					role="option"
					type="button"
				>
					<BookOpenIcon
						aria-hidden="true"
						className="size-3.5 shrink-0 text-muted-foreground"
					/>
					<span className="truncate font-serif">{passage.label}</span>
				</button>
			))}
		</div>
	);
}
