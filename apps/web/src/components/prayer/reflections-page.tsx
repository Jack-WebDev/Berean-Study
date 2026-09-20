import type { LibraryReflection } from "@berean-study/db/prayers";
import { RichTextRenderer } from "@berean-study/rich-text-editor";
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
import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Input } from "@berean-study/ui/components/input";
import { Separator } from "@berean-study/ui/components/separator";
import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	ChevronRightIcon,
	EllipsisIcon,
	FileTextIcon,
	FilterIcon,
	PencilIcon,
	PlusIcon,
	SearchIcon,
	Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	deletePrayerReflection,
	listLibraryReflections,
} from "@/functions/prayers";
import { PrayerLibraryTabs } from "./library-tabs";
import {
	getReflectionExcerpt,
	parseReflectionContent,
} from "./reflection-content";

const pageSize = 20;
type Sort = "oldest" | "recent";

export function ReflectionsPage({
	filters,
	onFiltersChange,
	onClearSelection,
	onSelectReflection,
	selectedReflectionId,
}: {
	filters: { category?: string; query?: string; sort: Sort };
	onFiltersChange: (filters: {
		category?: string;
		query?: string;
		sort: Sort;
	}) => void;
	onClearSelection: () => void;
	onSelectReflection: (id: number) => void;
	selectedReflectionId?: number;
}) {
	const [result, setResult] = useState<Awaited<
		ReturnType<typeof listLibraryReflections>
	> | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [showFilters, setShowFilters] = useState(false);
	const [query, setQuery] = useState(filters.query ?? "");
	const [offset, setOffset] = useState(0);
	const [reflectionToDelete, setReflectionToDelete] =
		useState<LibraryReflection | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const loadReflections = useCallback(async () => {
		setLoadFailed(false);
		try {
			setResult(
				await listLibraryReflections({
					data: {
						category: filters.category,
						limit: pageSize,
						offset,
						query: filters.query,
						sort: filters.sort,
					},
				}),
			);
		} catch {
			setLoadFailed(true);
		}
	}, [filters.category, filters.query, filters.sort, offset]);

	useEffect(() => {
		void loadReflections();
	}, [loadReflections]);
	useEffect(() => {
		setQuery(filters.query ?? "");
	}, [filters.query]);
	const changeFilters = (nextFilters: {
		category?: string;
		query?: string;
		sort: Sort;
	}) => {
		setOffset(0);
		onFiltersChange(nextFilters);
	};

	const reflections = result?.reflections ?? [];
	const selectedReflection = useMemo(
		() =>
			reflections.find(
				(reflection) => reflection.id === selectedReflectionId,
			) ??
			reflections[0] ??
			null,
		[reflections, selectedReflectionId],
	);
	const categories = useMemo(
		() =>
			[...new Set(reflections.map((reflection) => reflection.prayer.category))]
				.filter((category): category is string => Boolean(category))
				.sort(),
		[reflections],
	);
	const deleteReflection = async () => {
		if (!reflectionToDelete) return;
		setIsDeleting(true);
		try {
			const deleted = await deletePrayerReflection({
				data: {
					prayerId: reflectionToDelete.prayerId,
					reflectionId: reflectionToDelete.id,
				},
			});
			if (!deleted) throw new Error("Reflection not found.");
			setResult((current) =>
				current
					? {
							...current,
							reflections: current.reflections.filter(
								(reflection) => reflection.id !== reflectionToDelete.id,
							),
							total: current.total - 1,
						}
					: current,
			);
			setReflectionToDelete(null);
			onClearSelection();
			toast.success("Reflection deleted.");
		} catch {
			toast.error("We couldn't delete this reflection. Please try again.");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="min-h-full px-5 py-6 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
				<header className="relative min-h-30 pt-1">
					<h1 className="font-serif text-4xl text-primary tracking-[-0.035em] sm:text-5xl">
						Reflections
					</h1>
					<p className="mt-1 text-muted-foreground">
						Look back on what you were learning, seeing, or experiencing through
						your prayers.
					</p>
					<blockquote className="absolute top-0 right-0 hidden w-72 text-center text-muted-foreground text-xs italic leading-4 xl:block">
						“I will remember the deeds of the Lord; yes, I will remember your
						miracles of long ago.”
						<span className="mt-2 block not-italic">Psalm 77:11</span>
					</blockquote>
					<div className="mt-5">
						<PrayerLibraryTabs active="reflections" />
					</div>
				</header>
				{loadFailed ? (
					<LoadError onRetry={loadReflections} />
				) : (
					<div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(23rem,.92fr)]">
						<ReflectionList
							categories={categories}
							filters={filters}
							isLoading={result === null}
							hasMobileSelection={selectedReflectionId !== undefined}
							onFiltersChange={changeFilters}
							onQueryChange={setQuery}
							onPageChange={setOffset}
							onSearch={() =>
								onFiltersChange({
									...filters,
									query: query.trim() || undefined,
								})
							}
							onSelect={onSelectReflection}
							query={query}
							reflections={reflections}
							offset={offset}
							resultTotal={result?.total ?? 0}
							selectedReflectionId={selectedReflection?.id}
							showFilters={showFilters}
							onToggleFilters={() => setShowFilters((visible) => !visible)}
						/>
						<ReflectionDetail
							hasMobileSelection={selectedReflectionId !== undefined}
							onBack={onClearSelection}
							onDelete={setReflectionToDelete}
							reflection={selectedReflection}
						/>
					</div>
				)}
				<AlertDialog
					open={reflectionToDelete !== null}
					onOpenChange={(open) => {
						if (!open && !isDeleting) setReflectionToDelete(null);
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete this reflection?</AlertDialogTitle>
							<AlertDialogDescription>
								This only removes this reflection. The prayer and its other
								reflections will remain unchanged.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isDeleting}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								disabled={isDeleting}
								onClick={deleteReflection}
							>
								{isDeleting ? "Deleting…" : "Delete reflection"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</main>
		</div>
	);
}

function ReflectionList({
	categories,
	filters,
	hasMobileSelection,
	isLoading,
	onFiltersChange,
	onQueryChange,
	onPageChange,
	onSearch,
	onSelect,
	onToggleFilters,
	offset,
	query,
	reflections,
	resultTotal,
	selectedReflectionId,
	showFilters,
}: {
	categories: string[];
	filters: { category?: string; query?: string; sort: Sort };
	hasMobileSelection: boolean;
	isLoading: boolean;
	onFiltersChange: (filters: {
		category?: string;
		query?: string;
		sort: Sort;
	}) => void;
	onQueryChange: (value: string) => void;
	onPageChange: (offset: number) => void;
	onSearch: () => void;
	onSelect: (id: number) => void;
	onToggleFilters: () => void;
	offset: number;
	query: string;
	reflections: LibraryReflection[];
	resultTotal: number;
	selectedReflectionId?: number;
	showFilters: boolean;
}) {
	return (
		<Card
			className={`${hasMobileSelection ? "hidden xl:block" : "block"} gap-0 rounded-xl py-0 shadow-sm ring-foreground/8`}
		>
			<CardHeader className="space-y-3 px-4 py-3">
				<CardTitle className="font-serif text-lg">My Reflections</CardTitle>
				<form
					className="flex flex-wrap items-center gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						onSearch();
					}}
				>
					<div className="relative min-w-48 flex-1">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							aria-label="Search reflections"
							className="h-9 pl-9"
							onChange={(event) => onQueryChange(event.target.value)}
							placeholder="Search reflections…"
							value={query}
						/>
					</div>
					<select
						aria-label="Sort reflections"
						className="h-9 rounded-md border bg-background px-2 text-sm"
						onChange={(event) =>
							onFiltersChange({ ...filters, sort: event.target.value as Sort })
						}
						value={filters.sort}
					>
						<option value="recent">Most recent</option>
						<option value="oldest">Oldest</option>
					</select>
					<Button
						aria-expanded={showFilters}
						onClick={onToggleFilters}
						size="sm"
						type="button"
						variant="outline"
					>
						<FilterIcon /> Filter
					</Button>
				</form>
				{showFilters ? (
					<select
						aria-label="Filter by prayer category"
						className="h-9 w-full rounded-md border bg-background px-2 text-sm"
						onChange={(event) =>
							onFiltersChange({
								...filters,
								category: event.target.value || undefined,
							})
						}
						value={filters.category ?? ""}
					>
						<option value="">All prayer categories</option>
						{categories.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>
				) : null}
			</CardHeader>
			<CardContent className="px-3 pb-2">
				{isLoading ? (
					<p className="px-2 py-8 text-muted-foreground text-sm">
						Loading reflections…
					</p>
				) : null}
				{!isLoading && reflections.length === 0 ? <EmptyReflections /> : null}
				{reflections.map((reflection, index) => (
					<ReflectionRow
						isSelected={reflection.id === selectedReflectionId}
						key={reflection.id}
						onSelect={() => onSelect(reflection.id)}
						reflection={reflection}
						showSeparator={index < reflections.length - 1}
					/>
				))}
				{resultTotal > pageSize ? (
					<div className="flex items-center justify-between gap-3 px-2 py-3">
						<span className="text-muted-foreground text-xs">
							{offset + 1}–{Math.min(offset + pageSize, resultTotal)} of{" "}
							{resultTotal}
						</span>
						<div className="flex gap-2">
							<Button
								disabled={offset === 0}
								onClick={() => onPageChange(Math.max(0, offset - pageSize))}
								size="sm"
								variant="outline"
							>
								Previous
							</Button>
							<Button
								disabled={offset + pageSize >= resultTotal}
								onClick={() => onPageChange(offset + pageSize)}
								size="sm"
								variant="outline"
							>
								Next
							</Button>
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function ReflectionRow({
	isSelected,
	onSelect,
	reflection,
	showSeparator,
}: {
	isSelected: boolean;
	onSelect: () => void;
	reflection: LibraryReflection;
	showSeparator: boolean;
}) {
	return (
		<div
			className={
				isSelected ? "rounded-lg bg-muted/65 ring-1 ring-primary/10" : ""
			}
		>
			<button
				className="flex w-full items-center gap-3 px-2 py-3 text-left"
				onClick={onSelect}
				type="button"
			>
				<div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<FileTextIcon className="size-5" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="line-clamp-2 font-serif text-sm leading-5">
						{getReflectionExcerpt(reflection.content) || "Reflection"}
					</p>
					<p className="mt-1 text-[11px] text-muted-foreground">
						Linked to:{" "}
						<span className="font-medium text-primary">
							{reflection.prayer.title}
						</span>
					</p>
				</div>
				<div className="hidden shrink-0 text-right text-[11px] text-muted-foreground sm:block">
					{formatDate(reflection.createdAt)}
				</div>
				<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
			</button>
			{showSeparator ? <Separator className="mx-2 w-auto" /> : null}
		</div>
	);
}

function ReflectionDetail({
	hasMobileSelection,
	onBack,
	onDelete,
	reflection,
}: {
	hasMobileSelection: boolean;
	onBack: () => void;
	onDelete: (reflection: LibraryReflection) => void;
	reflection: LibraryReflection | null;
}) {
	if (!reflection)
		return (
			<Card className="hidden min-h-96 rounded-xl xl:flex">
				<Empty>
					<EmptyHeader>
						<EmptyTitle>Select a reflection</EmptyTitle>
						<EmptyDescription>
							Choose a reflection from your library to read it here.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</Card>
		);
	return (
		<aside className={hasMobileSelection ? "block" : "hidden xl:block"}>
			<Card className="gap-0 rounded-xl py-2 shadow-sm ring-foreground/8 xl:sticky xl:top-6">
				<CardContent className="px-4 py-3">
					<Button
						className="mb-4 xl:hidden"
						onClick={onBack}
						size="sm"
						variant="ghost"
					>
						Back to reflections
					</Button>
					<div className="flex items-start justify-between gap-3">
						<div>
							<h2 className="font-serif text-2xl">Reflection</h2>
							<p className="mt-1 text-muted-foreground text-xs">
								{formatDate(reflection.createdAt)}
							</p>
						</div>
						<div className="flex items-center gap-1">
							<Button
								render={
									<Link
										params={{
											prayerId: reflection.prayerId,
											reflectionId: reflection.id,
										}}
										to="/library/prayers/$prayerId/reflections/$reflectionId/edit"
									/>
								}
								size="sm"
								variant="outline"
							>
								<PencilIcon /> Edit reflection
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											aria-label="Reflection actions"
											size="icon"
											variant="ghost"
										/>
									}
								>
									<EllipsisIcon />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => onDelete(reflection)}
										variant="destructive"
									>
										<Trash2Icon /> Delete reflection
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
					<div className="mt-5">
						<RichTextRenderer
							document={parseReflectionContent(reflection.content)}
							preset="member"
						/>
					</div>
					<Separator className="my-5" />
					<section>
						<h3 className="flex items-center gap-2 font-serif text-lg">
							<BookOpenIcon className="size-4 text-primary" /> Linked Prayer
						</h3>
						<div className="mt-3 rounded-lg bg-muted/60 p-3">
							<h4 className="font-medium text-sm">{reflection.prayer.title}</h4>
							<p className="mt-1 text-muted-foreground text-xs">
								{formatDate(reflection.prayer.createdAt)}
							</p>
							{reflection.prayer.category ? (
								<Badge className="mt-2" variant="secondary">
									{reflection.prayer.category}
								</Badge>
							) : null}
							<p className="mt-2 line-clamp-3 text-muted-foreground text-xs leading-4">
								{getReflectionExcerpt(reflection.prayer.content, 180)}
							</p>
							<Link
								className="mt-3 inline-flex font-medium text-primary text-xs hover:underline"
								to="/library/prayers"
							>
								Open prayer
							</Link>
						</div>
					</section>
					<section className="mt-5">
						<div className="flex items-center justify-between gap-2">
							<h3 className="font-serif text-lg">More Reflections</h3>
							<Button
								render={
									<Link
										params={{ prayerId: reflection.prayerId }}
										to="/library/prayers/$prayerId/reflections/new"
									/>
								}
								size="sm"
							>
								<PlusIcon /> Add reflection
							</Button>
						</div>
						<Link
							className="mt-2 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-muted-foreground text-xs hover:text-foreground"
							to="/library/prayers"
						>
							<span>
								{reflection.prayerReflectionCount}{" "}
								{reflection.prayerReflectionCount === 1
									? "reflection"
									: "reflections"}{" "}
								on this prayer
							</span>
							<ChevronRightIcon className="size-4" />
						</Link>
					</section>
				</CardContent>
			</Card>
		</aside>
	);
}

function EmptyReflections() {
	return (
		<Empty className="min-h-72">
			<EmptyHeader>
				<EmptyTitle>No reflections yet</EmptyTitle>
				<EmptyDescription>
					Reflections appear here when you look back on a prayer and record what
					you&apos;re learning, seeing, or experiencing.
				</EmptyDescription>
			</EmptyHeader>
			<Button
				render={<Link to="/library/prayers" />}
				size="sm"
				variant="outline"
			>
				View prayers
			</Button>
		</Empty>
	);
}
function LoadError({ onRetry }: { onRetry: () => void }) {
	return (
		<Card className="rounded-xl">
			<Empty className="min-h-72">
				<EmptyHeader>
					<EmptyTitle>Reflections are unavailable</EmptyTitle>
					<EmptyDescription>
						We couldn’t load your reflections right now.
					</EmptyDescription>
				</EmptyHeader>
				<Button onClick={onRetry} size="sm">
					Try again
				</Button>
			</Empty>
		</Card>
	);
}
function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}
