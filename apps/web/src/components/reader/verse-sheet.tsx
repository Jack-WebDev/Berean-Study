import { cn } from "@berean-study/ui/lib/utils";
import {
	BookmarkIcon,
	CopyIcon,
	FolderPlusIcon,
	HighlighterIcon,
	NotebookPenIcon,
	Share2Icon,
} from "lucide-react";
import type { ReactNode } from "react";

import { BottomSheet } from "@/components/reader-ui/bottom-sheet";
import { ReaderButton } from "@/components/reader-ui/button";

/*
 * What can be done with the chosen verses (HANDOFF Screen 2). A light sheet, so
 * the reader can keep tapping verses to add or remove them while it's open. When
 * the last verse is unchosen, or Done is tapped, it closes.
 */

function ActionTile({
	compact,
	icon,
	label,
	onClick,
}: {
	compact: boolean;
	icon: ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			className={cn(
				"reader-focus flex items-center justify-center rounded-(--ios-control-radius) border border-border bg-card px-1 text-foreground hover:bg-muted",
				compact
					? "min-h-12 gap-1.5 py-1 text-center [&_svg]:size-4"
					: "h-18 flex-col gap-1.5 [&_svg]:size-6",
			)}
			onClick={onClick}
			type="button"
		>
			<span aria-hidden="true">{icon}</span>
			<span
				className={cn(
					"font-semibold leading-tight",
					compact ? "text-[14px]" : "text-[15px]",
				)}
			>
				{label}
			</span>
		</button>
	);
}

export type VerseActions = {
	onAddNote: () => void;
	onAddToCollection: () => void;
	onCopy: () => void;
	onHighlight: () => void;
	onSave: () => void;
	onShare: () => void;
};

/**
 * Highlight, Add a note, Save, Add to collection, Copy and Share, as a 3 × 2 grid.
 * Compact tiles sit at the top of the study panel on a computer.
 */
export function VerseActionGrid({
	actions,
	allHighlighted,
	compact = false,
}: {
	actions: VerseActions;
	allHighlighted: boolean;
	compact?: boolean;
}) {
	return (
		<div className="grid grid-cols-3 gap-2">
			<ActionTile
				compact={compact}
				icon={<HighlighterIcon />}
				label={allHighlighted ? "Remove highlight" : "Highlight"}
				onClick={actions.onHighlight}
			/>
			<ActionTile
				compact={compact}
				icon={<NotebookPenIcon />}
				label="Add a note"
				onClick={actions.onAddNote}
			/>
			<ActionTile
				compact={compact}
				icon={<BookmarkIcon />}
				label="Save"
				onClick={actions.onSave}
			/>
			<ActionTile
				compact={compact}
				icon={<FolderPlusIcon />}
				label={compact ? "To collection" : "Add to collection"}
				onClick={actions.onAddToCollection}
			/>
			<ActionTile
				compact={compact}
				icon={<CopyIcon />}
				label="Copy"
				onClick={actions.onCopy}
			/>
			<ActionTile
				compact={compact}
				icon={<Share2Icon />}
				label="Share"
				onClick={actions.onShare}
			/>
		</div>
	);
}

export function VerseSheet({
	actions,
	allHighlighted,
	onOpenChange,
	onStudy,
	open,
	reference,
	studyGroupCount,
	verseCount,
}: {
	actions: VerseActions;
	/** Every chosen verse is already highlighted, so the action removes it. */
	allHighlighted: boolean;
	onOpenChange: (open: boolean) => void;
	onStudy: () => void;
	open: boolean;
	/** The chosen verses in words, such as "Romans 8:28–30, 33". */
	reference: string;
	/** How many kinds of study notes the chosen verses have, if known. */
	studyGroupCount: number | null;
	verseCount: number;
}) {
	return (
		<BottomSheet
			closeLabel="Done"
			description="Tap other verses to add them."
			kind="light"
			onOpenChange={onOpenChange}
			open={open}
			title={reference}
		>
			<ReaderButton
				aria-haspopup="dialog"
				className="mb-3 h-auto min-h-14 w-full flex-col gap-0 py-2"
				onClick={onStudy}
				variant="primary"
			>
				<span>
					{verseCount > 1 ? "Study these verses" : "Study this verse"}
				</span>
				<span className="font-normal text-[15px] opacity-90">
					{studyGroupDescription(studyGroupCount, verseCount)}
				</span>
			</ReaderButton>
			<VerseActionGrid actions={actions} allHighlighted={allHighlighted} />
		</BottomSheet>
	);
}

/** The line under Study this verse. Never a zero: no notes says so in words. */
export function studyGroupDescription(count: number | null, verseCount = 1) {
	const these = verseCount > 1 ? "these verses" : "this verse";
	if (count === null) return "Notes, word meanings and related verses";
	if (count === 0) return `No notes for ${these} yet`;
	return `${count} ${count === 1 ? "kind" : "kinds"} of notes for ${these}`;
}
