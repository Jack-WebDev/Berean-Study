import { Button } from "@berean-study/ui/components/button";
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
import { Sheet, SheetTrigger } from "@berean-study/ui/components/sheet";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";
import {
	ArrowDownUpIcon,
	PlusIcon,
	SearchIcon,
	SearchXIcon,
} from "lucide-react";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useRef,
	useState,
} from "react";

import { listCollections } from "@/functions/collections";

import { type CollectionSummary, toCollectionSummary } from "./collection-data";
import { CollectionGrid } from "./collection-grid";
import { CollectionsSupportingContent } from "./collections-supporting-content";
import { NewCollectionSheet } from "./new-collection-sheet";

const collectionFilters = [
	{ label: "All", value: "all" },
	{ label: "Recent", value: "recent" },
	{ label: "Private", value: "private" },
	{ label: "Scripture Lists", value: "scripture-lists" },
	{ label: "Study Projects", value: "study-projects" },
] as const;

type CollectionFilter = (typeof collectionFilters)[number]["value"];
const collectionSortOptions = [
	{ label: "Last Updated", value: "updated-desc" },
	{ label: "Date Created", value: "created-desc" },
	{ label: "Name A–Z", value: "name-asc" },
	{ label: "Name Z–A", value: "name-desc" },
] as const;

type CollectionSort = (typeof collectionSortOptions)[number]["value"];
const recentCollectionThreshold = 30 * 24 * 60 * 60 * 1_000;
const collectionNameCollator = new Intl.Collator(undefined, {
	sensitivity: "base",
});

export function CollectionsPage({
	collections = [],
}: {
	collections?: readonly CollectionSummary[];
}) {
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
	const [savedCollections, setSavedCollections] = useState<
		CollectionSummary[] | null
	>(null);
	const [hasLoadError, setHasLoadError] = useState(false);
	const hasCreatedCollection = useRef(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<CollectionFilter>("all");
	const [sort, setSort] = useState<CollectionSort>("updated-desc");
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const loadCollections = useCallback(() => {
		let isCurrent = true;
		setHasLoadError(false);

		void listCollections()
			.then((result) => {
				if (isCurrent && !hasCreatedCollection.current) {
					setSavedCollections(result.map(toCollectionSummary));
				}
			})
			.catch(() => {
				if (isCurrent) setHasLoadError(true);
			});

		return () => {
			isCurrent = false;
		};
	}, []);

	useEffect(() => loadCollections(), [loadCollections]);

	const handleCollectionCreated = useCallback(
		(collection: CollectionSummary) => {
			hasCreatedCollection.current = true;
			setSavedCollections((currentCollections) => [
				collection,
				...(currentCollections ?? collections),
			]);
			setIsCreateSheetOpen(false);
		},
		[collections],
	);

	const displayedCollections = savedCollections ?? collections;
	const supportsCollectionFilters = savedCollections !== null;
	const normalizedSearchQuery = deferredSearchQuery.trim().toLocaleLowerCase();
	const searchResults = normalizedSearchQuery
		? displayedCollections.filter((collection) =>
				[
					collection.name,
					collection.description,
					...(collection.tags ?? []),
				].some((value) =>
					value.toLocaleLowerCase().includes(normalizedSearchQuery),
				),
			)
		: displayedCollections;
	const filteredCollections = supportsCollectionFilters
		? searchResults.filter((collection) =>
				matchesCollectionFilter(collection, activeFilter),
			)
		: searchResults;
	const sortedCollections = sortCollections(filteredCollections, sort);

	if (savedCollections === null && !hasLoadError) {
		return <CollectionsPageSkeleton />;
	}

	if (hasLoadError) {
		return <CollectionsLoadError onRetry={loadCollections} />;
	}

	return (
		<Sheet onOpenChange={setIsCreateSheetOpen} open={isCreateSheetOpen}>
			<div className="min-h-full bg-background px-5 py-8 text-foreground sm:px-8 sm:py-10 lg:px-10">
				<main className="mx-auto flex w-full max-w-[90rem] flex-col gap-8">
					<header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="font-serif text-4xl leading-none tracking-[-0.035em] sm:text-[2.75rem]">
								Collections
							</h1>
							<p className="mt-3 text-base text-muted-foreground sm:text-[1.0625rem]">
								Organize passages, notes, and study themes into saved study
								sets.
							</p>
						</div>
						<SheetTrigger
							render={
								<Button
									className="h-10 self-start rounded-md px-4 text-sm"
									size="lg"
								/>
							}
						>
							<PlusIcon aria-hidden="true" data-icon="inline-start" />
							New Collection
						</SheetTrigger>
					</header>

					<section
						aria-label="Collection controls"
						className="flex flex-col gap-3 xl:flex-row xl:items-center"
					>
						<label
							className="block w-full max-w-xl xl:w-[26rem] xl:shrink-0"
							htmlFor="collections-search"
						>
							<span className="sr-only">Search collections</span>
							<InputGroup className="h-10 rounded-md bg-card">
								<InputGroupInput
									id="collections-search"
									onChange={(event) => setSearchQuery(event.target.value)}
									placeholder="Search collections..."
									type="search"
									value={searchQuery}
								/>
								<InputGroupAddon align="inline-start">
									<SearchIcon aria-hidden="true" />
								</InputGroupAddon>
							</InputGroup>
						</label>
						<ToggleGroup
							aria-label="Collection filters"
							onValueChange={(values) => {
								const value = values[0] as CollectionFilter | undefined;
								if (value) setActiveFilter(value);
							}}
							spacing={2}
							value={[activeFilter]}
							variant="outline"
							className="max-w-full flex-wrap gap-2 xl:flex-1 xl:flex-nowrap"
						>
							{collectionFilters.map((filter) => (
								<ToggleGroupItem
									className="h-8 rounded-full border-0 bg-muted px-3 text-muted-foreground hover:bg-muted/75 data-[pressed]:bg-primary data-[pressed]:text-primary-foreground"
									disabled={!supportsCollectionFilters}
									key={filter.value}
									value={filter.value}
								>
									{filter.label}
								</ToggleGroupItem>
							))}
						</ToggleGroup>

						<label className="self-start xl:ml-auto" htmlFor="collections-sort">
							<span className="sr-only">Sort collections</span>
							<div className="flex items-center gap-2 text-muted-foreground">
								<ArrowDownUpIcon aria-hidden="true" className="size-4" />
								<NativeSelect
									className="w-40"
									id="collections-sort"
									onChange={(event) =>
										setSort(event.target.value as CollectionSort)
									}
									value={sort}
								>
									{collectionSortOptions.map((option) => (
										<NativeSelectOption key={option.value} value={option.value}>
											{option.label}
										</NativeSelectOption>
									))}
								</NativeSelect>
							</div>
						</label>
					</section>

					<CollectionGrid
						collections={sortedCollections}
						createAction={
							<SheetTrigger render={<Button />}>
								<PlusIcon aria-hidden="true" data-icon="inline-start" />
								Create Collection
							</SheetTrigger>
						}
						emptyState={
							normalizedSearchQuery ? (
								<CollectionSearchEmptyState
									onClear={() => setSearchQuery("")}
									query={deferredSearchQuery.trim()}
								/>
							) : supportsCollectionFilters && activeFilter !== "all" ? (
								<CollectionFilterEmptyState
									filter={
										collectionFilters.find(
											(filter) => filter.value === activeFilter,
										)?.label
									}
									onClear={() => setActiveFilter("all")}
								/>
							) : undefined
						}
					/>
					{sortedCollections.length > 0 ? (
						<CollectionsSupportingContent collections={displayedCollections} />
					) : null}
				</main>
			</div>
			{isCreateSheetOpen ? (
				<NewCollectionSheet onCreated={handleCollectionCreated} />
			) : null}
		</Sheet>
	);
}

function CollectionsPageSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-live="polite"
			className="min-h-full bg-background px-5 py-8 sm:px-8 sm:py-10 lg:px-10"
		>
			<span className="sr-only">Loading collections</span>
			<main
				aria-hidden="true"
				className="mx-auto flex w-full max-w-[90rem] flex-col gap-8"
			>
				<header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-3">
						<Skeleton className="h-11 w-52 rounded-md" />
						<Skeleton className="h-5 w-96 max-w-full rounded-md" />
					</div>
					<Skeleton className="h-10 w-40 rounded-md" />
				</header>
				<section className="flex flex-col gap-3 xl:flex-row xl:items-center">
					<Skeleton className="h-10 w-full max-w-xl rounded-md xl:w-[26rem]" />
					<Skeleton className="h-8 w-full rounded-full xl:flex-1" />
					<Skeleton className="h-10 w-40 rounded-md" />
				</section>
				<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{["first", "second", "third"].map((key) => (
						<div
							className="overflow-hidden rounded-xl border border-border/70 bg-card"
							key={key}
						>
							<Skeleton className="aspect-[16/6] w-full" />
							<div className="flex flex-col gap-3 p-5">
								<Skeleton className="h-6 w-2/3 rounded-md" />
								<Skeleton className="h-4 w-full rounded-md" />
								<Skeleton className="h-4 w-4/5 rounded-md" />
							</div>
						</div>
					))}
				</section>
				<Skeleton className="h-36 rounded-xl" />
			</main>
		</div>
	);
}

function CollectionsLoadError({ onRetry }: { onRetry: () => unknown }) {
	return (
		<div className="min-h-full bg-background px-5 py-8 text-foreground sm:px-8 sm:py-10 lg:px-10">
			<main className="mx-auto w-full max-w-[90rem]">
				<Empty className="min-h-80 rounded-xl border border-border/80 bg-card py-12 shadow-sm">
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
						<Button onClick={() => void onRetry()} type="button">
							Try again
						</Button>
					</EmptyContent>
				</Empty>
			</main>
		</div>
	);
}

function sortCollections(
	collections: readonly CollectionSummary[],
	sort: CollectionSort,
) {
	return collections
		.map((collection, index) => ({ collection, index }))
		.sort((left, right) => {
			const comparison = compareCollections(
				left.collection,
				right.collection,
				sort,
			);
			return comparison || left.index - right.index;
		})
		.map(({ collection }) => collection);
}

function compareCollections(
	left: CollectionSummary,
	right: CollectionSummary,
	sort: CollectionSort,
) {
	if (sort === "name-asc") {
		return collectionNameCollator.compare(left.name, right.name);
	}
	if (sort === "name-desc") {
		return collectionNameCollator.compare(right.name, left.name);
	}

	const timestamp =
		sort === "updated-desc" ? "updatedAtValue" : "createdAtValue";
	return (right[timestamp] ?? 0) - (left[timestamp] ?? 0);
}

function matchesCollectionFilter(
	collection: CollectionSummary,
	filter: CollectionFilter,
) {
	if (filter === "all") return true;
	if (filter === "private") return collection.visibility === "Private";
	if (filter === "recent") {
		return (
			collection.updatedAtValue !== undefined &&
			Date.now() - collection.updatedAtValue <= recentCollectionThreshold
		);
	}
	if (filter === "scripture-lists") {
		return (
			collection.allowedContent?.length === 1 &&
			collection.allowedContent[0] === "passages"
		);
	}
	return (collection.allowedContent?.length ?? 0) > 1;
}

function CollectionSearchEmptyState({
	onClear,
	query,
}: {
	onClear: () => void;
	query: string;
}) {
	return (
		<section aria-label="No matching collections" id="all-collections">
			<Empty className="min-h-80 rounded-xl border border-border/80 border-dashed bg-card py-12 shadow-sm">
				<EmptyHeader>
					<EmptyMedia
						className="size-12 rounded-full bg-secondary text-primary"
						variant="icon"
					>
						<SearchXIcon aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle className="font-serif text-2xl tracking-[-0.02em]">
						<h2>No matching collections</h2>
					</EmptyTitle>
					<EmptyDescription className="max-w-sm text-sm leading-6">
						No collection name, description, or tag matches “{query}”.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button onClick={onClear} type="button" variant="outline">
						Clear search
					</Button>
				</EmptyContent>
			</Empty>
		</section>
	);
}

function CollectionFilterEmptyState({
	filter,
	onClear,
}: {
	filter?: string;
	onClear: () => void;
}) {
	return (
		<section aria-label="No matching collections" id="all-collections">
			<Empty className="min-h-80 rounded-xl border border-border/80 border-dashed bg-card py-12 shadow-sm">
				<EmptyHeader>
					<EmptyMedia
						className="size-12 rounded-full bg-secondary text-primary"
						variant="icon"
					>
						<SearchXIcon aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle className="font-serif text-2xl tracking-[-0.02em]">
						<h2>No collections in {filter}</h2>
					</EmptyTitle>
					<EmptyDescription className="max-w-sm text-sm leading-6">
						Try a different filter to see more collections.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button onClick={onClear} type="button" variant="outline">
						Show all collections
					</Button>
				</EmptyContent>
			</Empty>
		</section>
	);
}
