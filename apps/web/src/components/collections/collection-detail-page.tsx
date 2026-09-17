"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@berean-study/ui/components/alert-dialog";
import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Sheet } from "@berean-study/ui/components/sheet";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	BookOpenIcon,
	Clock3Icon,
	EllipsisIcon,
	FileTextIcon,
	HighlighterIcon,
	ImageIcon,
	LockKeyholeIcon,
	PencilIcon,
	PlusCircleIcon,
	Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getNoteContentText } from "@/components/notes/note-content";
import {
	deleteCollection,
	getCollection,
	listCollectionNotes,
	listCollectionPassages,
	removeNoteFromCollection,
} from "@/functions/collections";
import { deleteNote } from "@/functions/notes";
import { CollectionCover } from "./collection-cover";
import { toCollectionSummary } from "./collection-data";
import { EditCollectionSheet } from "./new-collection-sheet";

const collectionViews = [
	{ label: "All", value: "all" },
	{ label: "Passages", value: "passages" },
	{ label: "Notes", value: "notes" },
	{ label: "Highlights", value: "highlights" },
	{ label: "Themes", value: "themes" },
] as const;

type CollectionView = (typeof collectionViews)[number]["value"];
type Collection = Awaited<ReturnType<typeof getCollection>>;
type CollectionNote = Awaited<ReturnType<typeof listCollectionNotes>>[number];
type CollectionPassage = Awaited<
	ReturnType<typeof listCollectionPassages>
>[number];

export function CollectionDetailPage({
	collectionId,
}: {
	collectionId: number;
}) {
	const [activeView, setActiveView] = useState<CollectionView>("all");
	const [collection, setCollection] = useState<Collection | undefined>(
		undefined,
	);
	const [hasLoadError, setHasLoadError] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeletingCollection, setIsDeletingCollection] = useState(false);
	const [deleteCollectionError, setDeleteCollectionError] = useState<
		string | null
	>(null);
	const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
	const [notes, setNotes] = useState<CollectionNote[] | undefined>(undefined);
	const [passages, setPassages] = useState<CollectionPassage[] | undefined>(
		undefined,
	);
	const navigate = useNavigate();

	const loadCollection = useCallback(async () => {
		setHasLoadError(false);
		setCollection(undefined);
		setNotes(undefined);
		setPassages(undefined);
		try {
			const [nextCollection, nextNotes, nextPassages] = await Promise.all([
				getCollection({ data: { id: collectionId } }),
				listCollectionNotes({ data: { id: collectionId } }),
				listCollectionPassages({ data: { id: collectionId } }),
			]);
			setCollection(nextCollection);
			setNotes(nextNotes);
			setPassages(nextPassages);
		} catch {
			setHasLoadError(true);
		}
	}, [collectionId]);

	useEffect(() => {
		void loadCollection();
	}, [loadCollection]);

	if (hasLoadError) {
		return (
			<CollectionDetailState
				description="Please try loading this collection again."
				onRetry={() => void loadCollection()}
				title="Collection unavailable"
			/>
		);
	}

	if (
		collection === undefined ||
		notes === undefined ||
		passages === undefined
	) {
		return <CollectionDetailSkeleton />;
	}

	if (collection === null) {
		return (
			<CollectionDetailState
				description="It may have been deleted or is no longer available."
				title="Collection not found"
			/>
		);
	}

	const summary = toCollectionSummary(collection);
	const activeViewLabel = collectionViews.find(
		(view) => view.value === activeView,
	)?.label;
	const showNotes = activeView === "all" || activeView === "notes";
	const showPassages = activeView === "all" || activeView === "passages";
	const isEmpty =
		activeView === "all"
			? notes.length === 0 && passages.length === 0
			: activeView === "notes"
				? notes.length === 0
				: activeView === "passages"
					? passages.length === 0
					: true;
	const removeNote = async (noteId: number) => {
		const removed = await removeNoteFromCollection({
			data: { id: collectionId, noteId },
		});
		if (!removed) throw new Error("Note membership not found.");
		setNotes((currentNotes) =>
			currentNotes?.filter((note) => note.id !== noteId),
		);
	};
	const deleteCollectionNote = async (noteId: number) => {
		const deleted = await deleteNote({ data: { id: noteId } });
		if (!deleted) throw new Error("Note not found.");
		setNotes((currentNotes) =>
			currentNotes?.filter((note) => note.id !== noteId),
		);
	};
	const confirmDeleteCollection = async () => {
		setDeleteCollectionError(null);
		setIsDeletingCollection(true);
		try {
			const deleted = await deleteCollection({ data: { id: collectionId } });
			if (!deleted) throw new Error("Collection not found.");
			await navigate({ to: "/library/collections" });
		} catch {
			setDeleteCollectionError(
				"We couldn't delete this collection. Please try again.",
			);
		} finally {
			setIsDeletingCollection(false);
		}
	};

	return (
		<Sheet onOpenChange={setIsEditSheetOpen} open={isEditSheetOpen}>
			<div className="min-h-full bg-background px-5 py-7 text-foreground sm:px-8 sm:py-8 lg:px-10 lg:pb-12">
				<main className="mx-auto w-full max-w-310">
					<Link
						className="inline-flex items-center gap-2 font-medium text-primary text-xs hover:underline"
						to="/library/collections"
					>
						<ArrowLeftIcon aria-hidden="true" className="size-3.5" />
						Collections
					</Link>

					<header className="mt-6">
						<div className="relative overflow-hidden rounded-2xl">
							<CollectionCover
								className="h-64 w-full object-cover sm:h-72 lg:h-80"
								src={summary.image}
							/>
							<div
								aria-hidden="true"
								className="absolute inset-0 bg-linear-to-t from-black/50 via-black/5 to-transparent"
							/>
							<div className="absolute top-4 right-4 flex items-center gap-2 sm:top-5 sm:right-5">
								<Button
									className="bg-primary/80 text-primary-foreground shadow-none hover:bg-primary"
									onClick={() => setIsEditSheetOpen(true)}
									type="button"
									variant="secondary"
								>
									<ImageIcon aria-hidden="true" data-icon="inline-start" />
									<span className="hidden sm:inline">Change Cover</span>
									<span className="sm:hidden">Cover</span>
								</Button>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												className="bg-primary/80 text-primary-foreground shadow-none hover:bg-primary"
												size="icon"
												type="button"
												variant="secondary"
											/>
										}
									>
										<EllipsisIcon aria-hidden="true" />
										<span className="sr-only">Collection actions</span>
									</DropdownMenuTrigger>
									<CollectionActionItems
										onDelete={() => setIsDeleteDialogOpen(true)}
										onEdit={() => setIsEditSheetOpen(true)}
									/>
								</DropdownMenu>
							</div>
						</div>

						<div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
							<div>
								<h1 className="font-serif text-4xl leading-none tracking-[-0.035em] sm:text-5xl">
									{collection.name}
								</h1>
								{collection.description ? (
									<p className="mt-2 max-w-3xl text-muted-foreground text-sm leading-6 sm:text-base">
										{collection.description}
									</p>
								) : null}
							</div>
							<div className="flex flex-wrap items-center gap-2 lg:shrink-0">
								<Button onClick={() => setIsEditSheetOpen(true)} type="button">
									<PencilIcon aria-hidden="true" data-icon="inline-start" />
									Edit Collection
								</Button>
								<Button disabled type="button" variant="outline">
									<PlusCircleIcon aria-hidden="true" data-icon="inline-start" />
									Add Content
								</Button>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button size="icon" type="button" variant="outline" />
										}
									>
										<EllipsisIcon aria-hidden="true" />
										<span className="sr-only">More collection actions</span>
									</DropdownMenuTrigger>
									<CollectionActionItems
										onDelete={() => setIsDeleteDialogOpen(true)}
										onEdit={() => setIsEditSheetOpen(true)}
									/>
								</DropdownMenu>
							</div>
						</div>

						<div className="mt-5 flex flex-wrap items-center gap-x-0 gap-y-2 text-muted-foreground text-sm">
							<CollectionMetadata icon={LockKeyholeIcon} label="Private" />
							<CollectionMetadata icon={Clock3Icon} label={summary.updatedAt} />
							<CollectionMetadata
								icon={BookOpenIcon}
								label={`${passages.length} passages`}
							/>
							<CollectionMetadata
								icon={FileTextIcon}
								label={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
							/>
							<CollectionMetadata icon={HighlighterIcon} label="0 highlights" />
						</div>
					</header>

					<section className="mt-5 border-border/70 border-t pt-4">
						<ToggleGroup
							aria-label="Collection content view"
							className="flex-wrap gap-2"
							onValueChange={(values) =>
								setActiveView(
									(values[0] as CollectionView | undefined) ?? "all",
								)
							}
							value={[activeView]}
							variant="outline"
						>
							{collectionViews.map((view) => (
								<ToggleGroupItem
									className="h-9 rounded-full px-4 data-[pressed]:bg-primary data-[pressed]:text-primary-foreground"
									key={view.value}
									value={view.value}
								>
									{view.label}
								</ToggleGroupItem>
							))}
						</ToggleGroup>

						{showNotes && notes.length > 0 ? (
							<CollectionNotes
								notes={notes}
								onDelete={deleteCollectionNote}
								onRemove={removeNote}
							/>
						) : null}
						{showPassages && passages.length > 0 ? (
							<CollectionPassages passages={passages} />
						) : null}
						{isEmpty ? (
							<Empty className="mt-5 min-h-64 rounded-xl border border-border/70 bg-card py-12">
								<EmptyHeader>
									<EmptyMedia
										className="size-16 rounded-full bg-secondary text-primary"
										variant="icon"
									>
										<BookOpenIcon aria-hidden="true" />
									</EmptyMedia>
									<EmptyTitle className="font-serif text-xl tracking-[-0.02em]">
										{activeView === "all"
											? "No study material yet"
											: `No ${activeViewLabel?.toLowerCase()} yet`}
									</EmptyTitle>
									<EmptyDescription className="max-w-xl text-center text-sm leading-5">
										Add passages, notes, highlights, or themes to start building
										this collection. Your content will appear here in a study
										timeline.
									</EmptyDescription>
								</EmptyHeader>
								<EmptyContent className="flex-row gap-3">
									<Button disabled type="button">
										<BookOpenIcon aria-hidden="true" data-icon="inline-start" />
										Add Passages
									</Button>
									<Button disabled type="button" variant="outline">
										<FileTextIcon aria-hidden="true" data-icon="inline-start" />
										Add Notes
									</Button>
								</EmptyContent>
							</Empty>
						) : null}
					</section>
				</main>
			</div>
			{isEditSheetOpen ? (
				<EditCollectionSheet
					collection={collection}
					key={collection.id}
					onUpdated={(updatedCollection) => {
						setCollection(updatedCollection);
						setIsEditSheetOpen(false);
					}}
				/>
			) : null}
			<AlertDialog
				onOpenChange={(open) => {
					if (!open && !isDeletingCollection) {
						setDeleteCollectionError(null);
						setIsDeleteDialogOpen(false);
					}
				}}
				open={isDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete "{collection.name}"?</AlertDialogTitle>
						<AlertDialogDescription>
							The collection will be deleted, but its passages, notes, and
							highlights will remain in your Library.
						</AlertDialogDescription>
						{deleteCollectionError ? (
							<p className="text-destructive text-xs" role="alert">
								{deleteCollectionError}
							</p>
						) : null}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeletingCollection}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={isDeletingCollection}
							onClick={() => void confirmDeleteCollection()}
							variant="destructive"
						>
							{isDeletingCollection ? "Deleting…" : "Delete Collection"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Sheet>
	);
}

function CollectionActionItems({
	onDelete,
	onEdit,
}: {
	onDelete: () => void;
	onEdit: () => void;
}) {
	return (
		<DropdownMenuContent align="end">
			<DropdownMenuItem onClick={onEdit}>Edit Collection</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={onDelete} variant="destructive">
				<Trash2Icon aria-hidden="true" />
				Delete Collection
			</DropdownMenuItem>
		</DropdownMenuContent>
	);
}

function CollectionMetadata({
	icon: Icon,
	label,
}: {
	icon: typeof BookOpenIcon;
	label: string;
}) {
	return (
		<span className="mr-4 flex items-center gap-2 border-border/70 border-r pr-4 last:mr-0 last:border-r-0 last:pr-0">
			<Icon aria-hidden="true" className="size-4" />
			{label}
		</span>
	);
}

function CollectionPassages({ passages }: { passages: CollectionPassage[] }) {
	return (
		<div className="mt-6 overflow-hidden rounded-xl border border-border/70 bg-card">
			<ul aria-label="Passages in this collection">
				{passages.map((passage) => (
					<li
						className="border-border/70 border-b px-4 py-4 text-sm last:border-b-0"
						key={passage.id}
					>
						<BookOpenIcon
							aria-hidden="true"
							className="mr-2 inline-block size-4 text-primary"
						/>
						{passage.title}
					</li>
				))}
			</ul>
		</div>
	);
}

function CollectionNotes({
	notes,
	onDelete,
	onRemove,
}: {
	notes: CollectionNote[];
	onDelete: (noteId: number) => Promise<void>;
	onRemove: (noteId: number) => Promise<void>;
}) {
	const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [removingNoteId, setRemovingNoteId] = useState<number | null>(null);

	const remove = (noteId: number) => {
		setError(null);
		setRemovingNoteId(noteId);
		void onRemove(noteId)
			.catch(() =>
				setError("We couldn't remove this note from the collection."),
			)
			.finally(() => setRemovingNoteId(null));
	};
	const deleteNoteFromCollection = () => {
		if (!deleteNoteId) return;
		setError(null);
		setIsDeleting(true);
		void onDelete(deleteNoteId)
			.then(() => setDeleteNoteId(null))
			.catch(() => setError("We couldn't delete this note. Please try again."))
			.finally(() => setIsDeleting(false));
	};

	return (
		<div className="mt-6 overflow-hidden rounded-xl border border-border/70 bg-card">
			{error ? (
				<p
					className="border-border/70 border-b px-4 py-3 text-destructive text-sm"
					role="alert"
				>
					{error}
				</p>
			) : null}
			<ul aria-label="Notes in this collection">
				{notes.map((note) => (
					<li
						className="flex items-start justify-between gap-4 border-border/70 border-b px-4 py-4 last:border-b-0"
						key={note.id}
					>
						<div className="min-w-0">
							<p className="font-medium text-sm">
								{note.passageTitle ?? note.bookName ?? "Unlinked note"}
							</p>
							<p className="mt-1 line-clamp-3 whitespace-pre-wrap text-muted-foreground text-sm leading-6">
								{getNoteContentText(note.content)}
							</p>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={<Button size="icon-sm" type="button" variant="ghost" />}
							>
								<EllipsisIcon aria-hidden="true" />
								<span className="sr-only">Note actions</span>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									disabled={removingNoteId === note.id}
									onClick={() => remove(note.id)}
								>
									<Trash2Icon aria-hidden="true" />
									Remove from Collection
								</DropdownMenuItem>
								<DropdownMenuItem
									render={
										<Link to="/library/notes" search={{ note: note.id }} />
									}
								>
									Open Note
								</DropdownMenuItem>
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onClick={() => setDeleteNoteId(note.id)}
								>
									<Trash2Icon aria-hidden="true" />
									Delete Note
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</li>
				))}
			</ul>
			<AlertDialog
				onOpenChange={(open) => {
					if (!open && !isDeleting) setDeleteNoteId(null);
				}}
				open={deleteNoteId !== null}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this note?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently deletes the note from all of its collections.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={isDeleting}
							onClick={deleteNoteFromCollection}
							variant="destructive"
						>
							{isDeleting ? "Deleting…" : "Delete note"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function CollectionDetailState({
	description,
	onRetry,
	title,
}: {
	description: string;
	onRetry?: () => void;
	title?: string;
}) {
	return (
		<div className="min-h-full bg-background px-5 py-8 text-foreground sm:px-8 sm:py-10 lg:px-10">
			<main className="mx-auto w-full max-w-[77.5rem]">
				<Link
					className="inline-flex items-center gap-2 font-medium text-primary text-xs hover:underline"
					to="/library/collections"
				>
					<ArrowLeftIcon aria-hidden="true" className="size-3.5" />
					Collections
				</Link>
				<Empty className="mt-8 border border-border/70 bg-card py-12">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<BookOpenIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>{title ?? "Loading collection"}</EmptyTitle>
						<EmptyDescription>{description}</EmptyDescription>
						{onRetry ? (
							<button
								className="mt-2 font-medium text-primary text-xs hover:underline"
								onClick={onRetry}
								type="button"
							>
								Try again
							</button>
						) : null}
					</EmptyHeader>
				</Empty>
			</main>
		</div>
	);
}

function CollectionDetailSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-live="polite"
			className="min-h-full bg-background px-5 py-8 sm:px-8 sm:py-10 lg:px-10"
		>
			<span className="sr-only">Loading collection</span>
			<main
				aria-hidden="true"
				className="mx-auto flex w-full max-w-[77.5rem] flex-col gap-6"
			>
				<Skeleton className="h-4 w-24 rounded-md" />
				<Skeleton className="h-64 w-full rounded-2xl sm:h-72 lg:h-80" />
				<div className="flex flex-col gap-3">
					<Skeleton className="h-12 w-3/5 rounded-md" />
					<Skeleton className="h-5 w-full rounded-md" />
					<Skeleton className="h-5 w-2/3 rounded-md" />
				</div>
				<Skeleton className="h-9 w-full rounded-full sm:w-96" />
				<Skeleton className="h-44 rounded-xl" />
			</main>
		</div>
	);
}
