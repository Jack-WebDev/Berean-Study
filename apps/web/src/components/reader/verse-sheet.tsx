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
	icon,
	label,
	onClick,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			className={cn(
				"reader-focus flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-[var(--ios-control-radius)] border border-border bg-card px-1 text-foreground hover:bg-muted",
				"[&_svg]:size-6",
			)}
			onClick={onClick}
			type="button"
		>
			<span aria-hidden="true">{icon}</span>
			<span className="font-semibold text-[15px] leading-tight">{label}</span>
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
	/** Shown only once the study panel is built. */
	onStudy?: () => void;
};

export function VerseSheet({
	actions,
	allHighlighted,
	onOpenChange,
	open,
	reference,
	studyGroupCount,
}: {
	actions: VerseActions;
	/** Every chosen verse is already highlighted, so the action removes it. */
	allHighlighted: boolean;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	/** The chosen verses in words, such as "Romans 8:28–30, 33". */
	reference: string;
	/** How many kinds of study notes the first chosen verse has, if known. */
	studyGroupCount: number | null;
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
			{actions.onStudy ? (
				<ReaderButton
					className="mb-3 h-auto min-h-14 w-full flex-col gap-0 py-2"
					onClick={actions.onStudy}
					variant="primary"
				>
					<span>Study this verse</span>
					<span className="font-normal text-[15px] opacity-90">
						{studyGroupCount
							? `${studyGroupCount} ${studyGroupCount === 1 ? "kind" : "kinds"} of notes for this verse`
							: "Notes, word meanings and related verses"}
					</span>
				</ReaderButton>
			) : null}
			<div className="grid grid-cols-3 gap-2">
				<ActionTile
					icon={<HighlighterIcon />}
					label={allHighlighted ? "Remove highlight" : "Highlight"}
					onClick={actions.onHighlight}
				/>
				<ActionTile
					icon={<NotebookPenIcon />}
					label="Add a note"
					onClick={actions.onAddNote}
				/>
				<ActionTile
					icon={<BookmarkIcon />}
					label="Save"
					onClick={actions.onSave}
				/>
				<ActionTile
					icon={<FolderPlusIcon />}
					label="Add to collection"
					onClick={actions.onAddToCollection}
				/>
				<ActionTile icon={<CopyIcon />} label="Copy" onClick={actions.onCopy} />
				<ActionTile
					icon={<Share2Icon />}
					label="Share"
					onClick={actions.onShare}
				/>
			</div>
		</BottomSheet>
	);
}
