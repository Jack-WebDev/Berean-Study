import { Button } from "@berean-study/ui/components/button";
import { Kbd } from "@berean-study/ui/components/kbd";
import { Spinner } from "@berean-study/ui/components/spinner";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	CheckIcon,
	Maximize2Icon,
	Minimize2Icon,
} from "lucide-react";
import type { ReactNode } from "react";

export function NotePageHeader({
	breadcrumb,
	isFocusMode,
	isSubmitting,
	noteId,
	onDiscard,
	onToggleFocusMode,
	saveStatus,
	submitLabel,
}: {
	breadcrumb: string;
	isFocusMode: boolean;
	isSubmitting: boolean;
	/** Set once saved, so "Notes" returns with this note selected. */
	noteId?: number;
	onDiscard: () => void;
	onToggleFocusMode: () => void;
	saveStatus: ReactNode;
	submitLabel: string;
}) {
	return (
		<header className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-5">
			<nav
				aria-label="Breadcrumb"
				className="flex min-w-0 items-center gap-2 text-muted-foreground text-sm"
			>
				<Link
					className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg pr-2 pl-1 text-secondary-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					search={noteId ? { note: noteId } : {}}
					to="/library/notes"
				>
					<ArrowLeftIcon aria-hidden="true" className="size-4" />
					Notes
				</Link>
				<span aria-hidden="true">/</span>
				<span
					aria-current="page"
					className="truncate font-medium text-foreground"
				>
					{breadcrumb}
				</span>
			</nav>
			<div className="ml-auto">{saveStatus}</div>
			<div className="flex items-center gap-2">
				<Button
					aria-keyshortcuts="Meta+Shift+F Control+Shift+F"
					aria-pressed={isFocusMode}
					className="h-10 rounded-[10px] px-3 font-medium text-secondary-foreground"
					onClick={onToggleFocusMode}
					title={isFocusMode ? "Exit focus mode (Esc)" : "Focus mode (⌘⇧F)"}
					type="button"
					variant="ghost"
				>
					{isFocusMode ? (
						<Minimize2Icon aria-hidden="true" data-icon="inline-start" />
					) : (
						<Maximize2Icon aria-hidden="true" data-icon="inline-start" />
					)}
					{isFocusMode ? "Exit focus" : "Focus mode"}
					<Kbd aria-hidden="true" className="ml-1 hidden sm:inline-flex">
						{isFocusMode ? "Esc" : "⌘⇧F"}
					</Kbd>
				</Button>
				<Button
					className="h-10 rounded-[10px] px-4 font-medium text-secondary-foreground"
					disabled={isSubmitting}
					onClick={onDiscard}
					type="button"
					variant="outline"
				>
					Discard
				</Button>
				<Button
					className="h-10 rounded-[10px] px-4.5 font-semibold"
					disabled={isSubmitting}
					type="submit"
				>
					{isSubmitting ? (
						<Spinner aria-hidden="true" data-icon="inline-start" />
					) : (
						<CheckIcon aria-hidden="true" data-icon="inline-start" />
					)}
					{submitLabel}
				</Button>
			</div>
		</header>
	);
}
