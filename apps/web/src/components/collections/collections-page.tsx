import { Button } from "@berean-study/ui/components/button";
import { Dialog, DialogTrigger } from "@berean-study/ui/components/dialog";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	LayoutGridIcon,
	ListIcon,
	PlusIcon,
	SearchIcon,
	SearchXIcon,
} from "lucide-react";
import { useDeferredValue, useId, useState } from "react";

import { collectionLibraryQueryOptions } from "@/queries/collections";

import { CollectionEmptyState } from "./collection-empty-state";
import { CollectionFormDialog } from "./collection-form-dialog";
import { CollectionGrid } from "./collection-grid";
import {
	type CollectionFilter,
	type CollectionSort,
	type CollectionType,
	type CollectionView,
	collectionFilters,
	collectionSorts,
	countByFilter,
	filterCollections,
	sortCollections,
	summarizeLibrary,
} from "./collection-library";
import { CollectionTemplates } from "./collection-templates";
import { ContinueStudyingCard } from "./continue-studying-card";

/** The library's view settings, kept in the URL so they survive a refresh. */
export type CollectionsSearch = {
	filter?: CollectionFilter;
	sort?: CollectionSort;
	view?: CollectionView;
};

export function CollectionsPage({
	onSearchChange,
	search,
}: {
	onSearchChange: (next: CollectionsSearch) => void;
	search: CollectionsSearch;
}) {
	const navigate = useNavigate();
	const libraryQuery = useQuery(collectionLibraryQueryOptions());
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [newType, setNewType] = useState<CollectionType>("project");
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const searchId = useId();
	const sortId = useId();

	const filter = search.filter ?? "all";
	const sort = search.sort ?? "updated";
	const view = search.view ?? "grid";
	// Defaults stay out of the URL so a plain visit has a plain address.
	const updateSearch = (change: CollectionsSearch) => {
		const next = { filter, sort, view, ...change };
		onSearchChange({
			filter: next.filter === "all" ? undefined : next.filter,
			sort: next.sort === "updated" ? undefined : next.sort,
			view: next.view === "grid" ? undefined : next.view,
		});
	};

	if (libraryQuery.isPending) return <CollectionsPageSkeleton />;
	if (libraryQuery.isError) {
		return <CollectionsLoadError onRetry={() => libraryQuery.refetch()} />;
	}

	const { collections, continueStudying } = libraryQuery.data;
	const counts = countByFilter(collections);
	const shown = sortCollections(
		filterCollections(collections, filter, deferredQuery),
		sort,
	);
	const continueCollection = continueStudying
		? collections.find(
				(collection) => collection.id === continueStudying.collectionId,
			)
		: undefined;

	const newCollectionButton = (label: string) => (
		<DialogTrigger
			onClick={() => setNewType("project")}
			render={<Button className="h-11 rounded-xl px-4.5 font-bold text-sm" />}
		>
			<PlusIcon aria-hidden="true" data-icon="inline-start" />
			{label}
		</DialogTrigger>
	);

	return (
		<Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
			<div className="min-h-full bg-background px-4 py-8 text-foreground sm:px-8 sm:py-11">
				<main className="mx-auto flex w-full max-w-295 flex-col gap-8">
					<header className="flex flex-wrap items-end justify-between gap-6">
						<div className="flex flex-col gap-2.5">
							<h1 className="font-serif text-4xl leading-none tracking-[-0.02em] sm:text-5xl">
								Collections
							</h1>
							<p className="text-[15px] text-muted-foreground">
								{collections.length
									? summarizeLibrary(collections)
									: "Organize passages and notes into studies you can return to."}
							</p>
						</div>
						{newCollectionButton("New collection")}
					</header>

					{collections.length === 0 ? (
						<CollectionEmptyState
							createAction={newCollectionButton("Create your first collection")}
						/>
					) : (
						<>
							{continueStudying && continueCollection ? (
								<ContinueStudyingCard
									collection={continueCollection}
									next={continueStudying.next}
									translation={continueStudying.translation}
								/>
							) : null}

							<section
								aria-label="Find a collection"
								className="flex flex-col gap-3.5"
							>
								<div className="flex flex-wrap items-center gap-3">
									<label className="flex-[1_1_16rem]" htmlFor={searchId}>
										<span className="sr-only">Filter collections</span>
										<InputGroup className="h-11 rounded-xl bg-card">
											<InputGroupInput
												id={searchId}
												onChange={(event) => setQuery(event.target.value)}
												placeholder="Filter by name, tag or passage…"
												type="search"
												value={query}
											/>
											<InputGroupAddon align="inline-start">
												<SearchIcon aria-hidden="true" />
											</InputGroupAddon>
										</InputGroup>
									</label>
									<div className="flex items-center gap-2">
										<label
											className="text-muted-foreground text-sm"
											htmlFor={sortId}
										>
											Sort
										</label>
										<NativeSelect
											className="h-11 rounded-xl bg-card font-semibold"
											id={sortId}
											onChange={(event) =>
												updateSearch({
													sort: event.target.value as CollectionSort,
												})
											}
											value={sort}
										>
											{collectionSorts.map((option) => (
												<NativeSelectOption
													key={option.value}
													value={option.value}
												>
													{option.label}
												</NativeSelectOption>
											))}
										</NativeSelect>
									</div>
									<ToggleGroup
										aria-label="View"
										className="rounded-xl border border-border bg-card p-0.75"
										onValueChange={(values) => {
											const next = values[0] as CollectionView | undefined;
											if (next) updateSearch({ view: next });
										}}
										spacing={0}
										value={[view]}
									>
										<ToggleGroupItem
											aria-label="Grid view"
											className="h-10 w-11 rounded-[9px] text-muted-foreground data-pressed:bg-primary data-pressed:text-primary-foreground"
											value="grid"
										>
											<LayoutGridIcon aria-hidden="true" />
										</ToggleGroupItem>
										<ToggleGroupItem
											aria-label="List view"
											className="h-10 w-11 rounded-[9px] text-muted-foreground data-pressed:bg-primary data-pressed:text-primary-foreground"
											value="list"
										>
											<ListIcon aria-hidden="true" />
										</ToggleGroupItem>
									</ToggleGroup>
								</div>
								<ToggleGroup
									aria-label="Filter by type"
									className="w-full flex-wrap"
									onValueChange={(values) => {
										const next = values[0] as CollectionFilter | undefined;
										if (next) updateSearch({ filter: next });
									}}
									spacing={2}
									value={[filter]}
								>
									{collectionFilters.map((option) => (
										<ToggleGroupItem
											className="h-11 gap-2 rounded-full border border-border-strong bg-card px-3.5 font-semibold text-body-foreground text-sm hover:border-muted-foreground/40 data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground"
											key={option.value}
											value={option.value}
										>
											{option.label}
											<span className="font-normal text-xs opacity-80">
												{counts[option.value]}
											</span>
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</section>

							{shown.length ? (
								<CollectionGrid
									collections={shown}
									newCollectionTile={
										<DialogTrigger
											className="flex min-h-75 flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-border-strong border-dashed font-semibold text-primary outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
											onClick={() => setNewType("project")}
										>
											<span className="grid size-12 place-items-center rounded-full border border-border-strong bg-card">
												<PlusIcon aria-hidden="true" className="size-5" />
											</span>
											New collection
										</DialogTrigger>
									}
									view={view}
								/>
							) : (
								<p
									className="rounded-2xl border border-border-strong border-dashed px-6 py-12 text-center text-[15px] text-muted-foreground"
									role="status"
								>
									{deferredQuery.trim()
										? `No collections match “${deferredQuery.trim()}”. Try a book name, a tag, or clear the filter.`
										: "No collections in this view yet."}
								</p>
							)}
						</>
					)}

					<CollectionTemplates onChoose={setNewType} />
				</main>
			</div>
			{isDialogOpen ? (
				<CollectionFormDialog
					initialType={newType}
					onSaved={(saved) => {
						setIsDialogOpen(false);
						void navigate({
							params: { collectionId: String(saved.id) },
							to: "/library/collections/$collectionId",
						});
					}}
				/>
			) : null}
		</Dialog>
	);
}

function CollectionsPageSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-live="polite"
			className="min-h-full bg-background px-4 py-8 sm:px-8 sm:py-11"
		>
			<span className="sr-only">Loading collections</span>
			<main
				aria-hidden="true"
				className="mx-auto flex w-full max-w-295 flex-col gap-8"
			>
				<header className="flex flex-wrap items-end justify-between gap-6">
					<div className="flex flex-col gap-3">
						<Skeleton className="h-12 w-56 rounded-md" />
						<Skeleton className="h-5 w-72 max-w-full rounded-md" />
					</div>
					<Skeleton className="h-11 w-40 rounded-xl" />
				</header>
				<Skeleton className="h-44 rounded-[20px]" />
				<div className="flex flex-col gap-3.5">
					<Skeleton className="h-11 w-full rounded-xl" />
					<Skeleton className="h-11 w-full max-w-2xl rounded-full" />
				</div>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18.75rem),1fr))] gap-6">
					{["first", "second", "third"].map((key) => (
						<div
							className="overflow-hidden rounded-2xl border border-border bg-card"
							key={key}
						>
							<Skeleton className="h-39 w-full rounded-none" />
							<div className="flex flex-col gap-3 p-5">
								<Skeleton className="h-6 w-2/3 rounded-md" />
								<Skeleton className="h-4 w-full rounded-md" />
								<Skeleton className="h-4 w-4/5 rounded-md" />
							</div>
						</div>
					))}
				</div>
			</main>
		</div>
	);
}

function CollectionsLoadError({ onRetry }: { onRetry: () => unknown }) {
	return (
		<div className="min-h-full bg-background px-4 py-8 text-foreground sm:px-8 sm:py-11">
			<main className="mx-auto w-full max-w-295">
				<Empty className="min-h-80 rounded-2xl border border-border bg-card py-12">
					<EmptyHeader>
						<EmptyMedia
							className="size-12 rounded-full bg-secondary text-primary"
							variant="icon"
						>
							<SearchXIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle className="font-serif text-2xl tracking-[-0.02em]">
							<h1>Collections unavailable</h1>
						</EmptyTitle>
						<EmptyDescription className="max-w-sm text-sm leading-6">
							We couldn&apos;t load your collections. Please try again.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button
							className="h-11 px-4 text-sm"
							onClick={() => void onRetry()}
							type="button"
						>
							Try again
						</Button>
					</EmptyContent>
				</Empty>
			</main>
		</div>
	);
}
