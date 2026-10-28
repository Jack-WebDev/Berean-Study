import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { Progress } from "@berean-study/ui/components/progress";
import {
	BookOpenIcon,
	EllipsisIcon,
	GlobeIcon,
	LockKeyholeIcon,
	PencilIcon,
	PinIcon,
	PinOffIcon,
	Trash2Icon,
	UsersRoundIcon,
} from "lucide-react";

import { formatTimeAgo } from "@/utils/dates";

import { coverStyle } from "./collection-colors";
import {
	type CollectionVisibility,
	pluralize,
	typeLabel,
	visibilityLabel,
} from "./collection-library";
import type {
	CollectionDetail,
	CollectionPassage,
} from "./use-collection-actions";

const visibilityIcons: Record<CollectionVisibility, typeof LockKeyholeIcon> = {
	private: LockKeyholeIcon,
	public: GlobeIcon,
	shared: UsersRoundIcon,
};

/** The collection's banner: its details, progress and main actions. */
export function CollectionHero({
	collection,
	isPinning,
	onContinue,
	onDelete,
	onEdit,
	onTogglePin,
	upNext,
}: {
	collection: CollectionDetail["collection"];
	isPinning: boolean;
	onContinue: () => void;
	onDelete: () => void;
	onEdit: () => void;
	onTogglePin: () => void;
	upNext: CollectionPassage | null;
}) {
	const VisibilityIcon = visibilityIcons[collection.visibility];
	const isProject = collection.progress !== null;
	const statsLine = [
		isProject
			? `${collection.readCount} of ${collection.passageCount} read`
			: pluralize(collection.passageCount, "passage"),
		pluralize(collection.noteCount, "note"),
		`updated ${formatTimeAgo(collection.updatedAt).toLowerCase()}`,
	].join(" · ");

	return (
		<section
			aria-labelledby="collection-title"
			className="collection-cover flex flex-wrap items-end gap-8 rounded-[22px] px-6 py-8 sm:px-10 sm:py-9"
			style={coverStyle(collection.color)}
		>
			<div className="flex min-w-0 flex-[1_1_30rem] flex-col gap-3.5">
				<div className="flex flex-wrap items-center gap-2 font-bold text-xs">
					<span className="rounded-full border border-current/30 px-2.5 py-1">
						{typeLabel(collection.type)}
					</span>
					<span className="inline-flex items-center gap-1.5 rounded-full border border-current/30 px-2.5 py-1">
						<VisibilityIcon aria-hidden="true" className="size-3.5" />
						{visibilityLabel(collection.visibility)}
					</span>
					{collection.tags.length ? (
						<span className="font-semibold">
							{collection.tags.map((tag) => `#${tag}`).join(" · ")}
						</span>
					) : null}
				</div>
				<h1
					className="font-serif text-4xl leading-[1.05] tracking-[-0.01em] sm:text-5xl"
					id="collection-title"
				>
					{collection.name}
				</h1>
				{collection.description ? (
					<p className="max-w-155 text-base">{collection.description}</p>
				) : null}
				<div className="mt-1 flex flex-wrap items-center gap-3.5">
					{isProject ? (
						<Progress
							aria-label="Study progress"
							className="w-65 max-w-full *:data-[slot=progress-track]:h-1.5 *:data-[slot=progress-track]:rounded-full *:data-[slot=progress-track]:bg-current/15 [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-current"
							value={collection.progress}
						/>
					) : null}
					<span className="font-semibold text-[13px]">{statsLine}</span>
				</div>
			</div>
			<div className="flex flex-wrap gap-2.5">
				{upNext ? (
					<a
						className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4.5 font-bold text-primary-foreground text-sm outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						href={`#passage-${upNext.passageId}`}
						onClick={onContinue}
					>
						<BookOpenIcon aria-hidden="true" className="size-4" />
						Continue at {upNext.reference}
					</a>
				) : null}
				{/* TODO(collections): Share, once sharing exists. */}
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								aria-label="More options"
								className="size-11 rounded-xl border-border-strong bg-card text-foreground"
								type="button"
								variant="outline"
							/>
						}
					>
						<EllipsisIcon aria-hidden="true" className="size-5" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-48">
						<DropdownMenuItem onClick={onEdit}>
							<PencilIcon aria-hidden="true" />
							Edit details
						</DropdownMenuItem>
						<DropdownMenuItem disabled={isPinning} onClick={onTogglePin}>
							{collection.pinned ? (
								<PinOffIcon aria-hidden="true" />
							) : (
								<PinIcon aria-hidden="true" />
							)}
							{collection.pinned ? "Unpin" : "Pin to top"}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onDelete} variant="destructive">
							<Trash2Icon aria-hidden="true" />
							Delete collection
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</section>
	);
}
