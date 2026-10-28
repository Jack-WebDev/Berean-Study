"use client";

import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { Progress } from "@berean-study/ui/components/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	BookOpenIcon,
	EllipsisIcon,
	FileTextIcon,
	GlobeIcon,
	LockKeyholeIcon,
	PinIcon,
	PinOffIcon,
	PlusIcon,
	UsersRoundIcon,
} from "lucide-react";
import { toast } from "sonner";

import { setCollectionPinned } from "@/functions/collections";
import { collectionKeys, libraryKeys } from "@/queries/keys";
import { formatTimeAgo } from "@/utils/dates";

import { coverStyle } from "./collection-colors";
import {
	type CollectionSummary,
	type CollectionVisibility,
	pluralize,
	typeLabel,
	visibilityLabel,
} from "./collection-library";

const visibilityIcons: Record<CollectionVisibility, typeof LockKeyholeIcon> = {
	private: LockKeyholeIcon,
	public: GlobeIcon,
	shared: UsersRoundIcon,
};

/** The cover's two lines: the passage reference and its opening verse. */
export function coverLines(collection: CollectionSummary) {
	const { cover } = collection;
	if (!cover) {
		return {
			reference: "Empty collection",
			verse: "Add a passage and its verse becomes this cover.",
		};
	}
	return cover.text
		? { reference: cover.reference, verse: `“${cover.text}”` }
		: { reference: "First passage", verse: cover.reference };
}

export function CollectionCard({
	collection,
}: {
	collection: CollectionSummary;
}) {
	const { reference, verse } = coverLines(collection);
	const params = { collectionId: String(collection.id) };

	return (
		<article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[box-shadow,translate] duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_color-mix(in_oklab,var(--primary),transparent_88%)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
			{/* The title link below is the card's one tab stop; this duplicates it for pointer users. */}
			<Link
				aria-hidden="true"
				className="collection-cover flex h-39 flex-col justify-between gap-3 px-5 py-4.5"
				params={params}
				style={coverStyle(collection.color)}
				tabIndex={-1}
				to="/library/collections/$collectionId"
			>
				<span className="flex items-center justify-between gap-3 font-bold text-[11px] uppercase tracking-widest">
					<span className="truncate">{reference}</span>
					{collection.pinned ? (
						<span className="inline-flex shrink-0 items-center gap-1">
							<PinIcon className="size-3.5" />
							Pinned
						</span>
					) : null}
				</span>
				<span className="line-clamp-3 font-serif text-[17px] italic leading-snug">
					{verse}
				</span>
			</Link>
			<div className="flex flex-1 flex-col gap-3 px-5 pt-4.5 pb-5">
				<div className="flex items-start gap-2">
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<h3 className="font-serif text-xl leading-tight tracking-[-0.01em]">
							<Link
								className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
								params={params}
								to="/library/collections/$collectionId"
							>
								{collection.name}
							</Link>
						</h3>
						{collection.description ? (
							<p className="line-clamp-2 text-muted-foreground text-sm">
								{collection.description}
							</p>
						) : null}
					</div>
					<CollectionMenu collection={collection} />
				</div>
				<ul aria-label="Type and tags" className="flex flex-wrap gap-1.5">
					<li className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground text-xs">
						{typeLabel(collection.type)}
					</li>
					{collection.tags.map((tag) => (
						<li
							className="rounded-full border border-border px-2.5 py-1 text-muted-foreground text-xs"
							key={tag}
						>
							#{tag}
						</li>
					))}
				</ul>
				{collection.progress ? (
					<CollectionProgress progress={collection.progress} />
				) : null}
				{collection.passageCount === 0 ? (
					<Link
						className="inline-flex min-h-11 items-center gap-1.5 self-start font-bold text-primary text-sm hover:underline"
						params={params}
						to="/library/collections/$collectionId"
					>
						<PlusIcon aria-hidden="true" className="size-4" />
						Add your first passage
						<span className="sr-only"> to {collection.name}</span>
					</Link>
				) : null}
				<div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-border-subtle border-t pt-3 text-muted-foreground text-xs">
					<span className="inline-flex items-center gap-3">
						<span className="inline-flex items-center gap-1.5">
							<BookOpenIcon aria-hidden="true" className="size-3.5" />
							{pluralize(collection.passageCount, "passage")}
						</span>
						<span className="inline-flex items-center gap-1.5">
							<FileTextIcon aria-hidden="true" className="size-3.5" />
							{collection.noteCount}
							<span className="sr-only">
								{collection.noteCount === 1 ? " note" : " notes"}
							</span>
						</span>
					</span>
					<span className="inline-flex items-center gap-3">
						<span>{formatTimeAgo(collection.updatedAt)}</span>
						<VisibilityLabel visibility={collection.visibility} />
					</span>
				</div>
			</div>
		</article>
	);
}

export function CollectionTableRow({
	collection,
}: {
	collection: CollectionSummary;
}) {
	return (
		<tr className="border-border-subtle border-b last:border-b-0 hover:bg-muted/40">
			<td className="py-3 pr-3 pl-4 sm:pl-5">
				<Link
					className="flex min-w-0 items-center gap-3.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
					params={{ collectionId: String(collection.id) }}
					to="/library/collections/$collectionId"
				>
					<span
						aria-hidden="true"
						className="collection-cover grid size-10 shrink-0 place-items-center rounded-[10px] font-serif text-lg"
						style={coverStyle(collection.color)}
					>
						{collection.name.charAt(0).toUpperCase()}
					</span>
					<span className="min-w-0">
						<strong className="block truncate font-semibold text-foreground">
							{collection.name}
							{collection.pinned ? (
								<PinIcon
									aria-label="Pinned"
									className="ml-1.5 inline size-3.5 text-muted-foreground"
									role="img"
								/>
							) : null}
						</strong>
						{collection.description ? (
							<span className="block truncate text-muted-foreground text-sm">
								{collection.description}
							</span>
						) : null}
					</span>
				</Link>
			</td>
			<td className="hidden px-3 text-secondary-foreground md:table-cell">
				{typeLabel(collection.type)}
			</td>
			<td className="hidden px-3 text-muted-foreground sm:table-cell">
				{pluralize(collection.passageCount, "passage")} ·{" "}
				{pluralize(collection.noteCount, "note")}
			</td>
			<td className="hidden px-3 text-muted-foreground lg:table-cell">
				{formatTimeAgo(collection.updatedAt)}
			</td>
			<td className="hidden px-3 lg:table-cell">
				<VisibilityLabel visibility={collection.visibility} />
			</td>
			<td className="w-14 pr-2">
				<CollectionMenu collection={collection} />
			</td>
		</tr>
	);
}

export function CollectionProgress({
	className = "",
	label = "Study progress",
	progress,
}: {
	className?: string;
	label?: string;
	progress: number;
}) {
	return (
		<div
			className={`flex items-center gap-2.5 font-semibold text-secondary-foreground text-xs ${className}`}
		>
			<Progress
				aria-label={label}
				className="flex-1 *:data-[slot=progress-track]:h-1.5 **:data-[slot=progress-indicator]:rounded-full *:data-[slot=progress-track]:rounded-full *:data-[slot=progress-track]:bg-secondary"
				value={progress}
			/>
			<span aria-hidden="true">{progress}%</span>
		</div>
	);
}

function VisibilityLabel({ visibility }: { visibility: CollectionVisibility }) {
	const Icon = visibilityIcons[visibility];
	return (
		<span className="inline-flex items-center gap-1 font-semibold text-secondary-foreground">
			<Icon aria-hidden="true" className="size-3.5" />
			{visibilityLabel(visibility)}
		</span>
	);
}

function CollectionMenu({ collection }: { collection: CollectionSummary }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const pinMutation = useMutation({
		mutationFn: (pinned: boolean) =>
			setCollectionPinned({ data: { id: collection.id, pinned } }),
		onError: () => toast.error("We couldn't update this collection."),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
				queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
			]),
	});

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={`More options for ${collection.name}`}
						className="-mt-1.5 -mr-2 size-11 shrink-0 rounded-lg text-muted-foreground"
						type="button"
						variant="ghost"
					/>
				}
			>
				<EllipsisIcon aria-hidden="true" className="size-5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() =>
						navigate({
							params: { collectionId: String(collection.id) },
							to: "/library/collections/$collectionId",
						})
					}
				>
					<BookOpenIcon aria-hidden="true" />
					Open
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={pinMutation.isPending}
					onClick={() => pinMutation.mutate(!collection.pinned)}
				>
					{collection.pinned ? (
						<PinOffIcon aria-hidden="true" />
					) : (
						<PinIcon aria-hidden="true" />
					)}
					{collection.pinned ? "Unpin" : "Pin to top"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
