import type { Testimony } from "@berean-study/db/testimonies";
import { RichTextRenderer } from "@berean-study/rich-text-editor";
import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Input } from "@berean-study/ui/components/input";
import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	ChevronRightIcon,
	LockKeyholeIcon,
	PencilIcon,
	PlusIcon,
	SearchIcon,
	UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PrayerLibraryTabs } from "@/components/prayer/library-tabs";
import {
	getReflectionExcerpt,
	parseReflectionContent,
} from "@/components/prayer/reflection-content";
import { listTestimonies, shareTestimony } from "@/functions/testimonies";

type Filter = "all" | "recent" | "shared";
type Sort = "oldest" | "recent" | "title";

export function TestimoniesPage() {
	const [testimonies, setTestimonies] = useState<Testimony[] | null>(null);
	const [failed, setFailed] = useState(false);
	const [filter, setFilter] = useState<Filter>("all");
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<Sort>("recent");
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const load = useCallback(async () => {
		setFailed(false);
		try {
			const next = await listTestimonies();
			setTestimonies(next);
			setSelectedId((current) =>
				next.some((item) => item.id === current)
					? current
					: (next[0]?.id ?? null),
			);
		} catch {
			setFailed(true);
		}
	}, []);
	useEffect(() => {
		void load();
	}, [load]);
	const visible = useMemo(
		() =>
			(testimonies ?? [])
				.filter(
					(item) =>
						(filter !== "shared" || item.sharedToCommunity) &&
						(filter !== "recent" ||
							Date.now() - new Date(item.updatedAt).getTime() <
								2_592_000_000) &&
						(!query.trim() ||
							[
								item.title,
								getReflectionExcerpt(item.content),
								...item.passages.map((passage) => passage.title ?? ""),
							]
								.join(" ")
								.toLowerCase()
								.includes(query.trim().toLowerCase())),
				)
				.toSorted((a, b) =>
					sort === "title"
						? a.title.localeCompare(b.title)
						: sort === "oldest"
							? +new Date(a.createdAt) - +new Date(b.createdAt)
							: +new Date(b.updatedAt) - +new Date(a.updatedAt),
				),
		[filter, query, sort, testimonies],
	);
	const selected =
		visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;
	const share = async (id: number) => {
		try {
			await shareTestimony({ data: { id } });
			toast.success("Testimony shared to Community.");
			void load();
		} catch {
			toast.error("We couldn't share this testimony. Please try again.");
		}
	};
	return (
		<div className="min-h-full px-5 py-6 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
				<header className="relative min-h-30 pt-1">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h1 className="font-serif text-4xl text-primary tracking-[-0.035em] sm:text-5xl">
								Prayers &amp; Testimonies
							</h1>
							<p className="mt-1 text-muted-foreground">
								Personal faith records, kept alongside your study.
							</p>
						</div>
						<Button render={<Link to="/library/testimonials/new" />}>
							<PlusIcon /> New Testimony
						</Button>
					</div>
					<div className="mt-5">
						<PrayerLibraryTabs active="testimonies" />
					</div>
				</header>
				{failed ? (
					<LoadError onRetry={load} />
				) : (
					<div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,.95fr)]">
						<TestimonyList
							filter={filter}
							loading={testimonies === null}
							onFilter={setFilter}
							onQuery={setQuery}
							onSelect={setSelectedId}
							onSort={setSort}
							query={query}
							selectedId={selected?.id}
							sort={sort}
							testimonies={visible}
						/>
						<TestimonyDetail onShare={share} testimony={selected} />
					</div>
				)}
			</main>
		</div>
	);
}

function TestimonyList({
	filter,
	loading,
	onFilter,
	onQuery,
	onSelect,
	onSort,
	query,
	selectedId,
	sort,
	testimonies,
}: {
	filter: Filter;
	loading: boolean;
	onFilter: (filter: Filter) => void;
	onQuery: (query: string) => void;
	onSelect: (id: number) => void;
	onSort: (sort: Sort) => void;
	query: string;
	selectedId?: number;
	sort: Sort;
	testimonies: Testimony[];
}) {
	return (
		<Card className="gap-0 rounded-xl py-0 shadow-sm ring-foreground/8">
			<CardHeader className="space-y-3 px-4 py-3">
				<CardTitle className="font-serif text-lg">My Testimonies</CardTitle>
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						className="pl-9"
						onChange={(event) => onQuery(event.target.value)}
						placeholder="Search testimonies…"
						value={query}
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<Filter active={filter === "all"} onClick={() => onFilter("all")}>
						All
					</Filter>
					<Filter
						active={filter === "recent"}
						onClick={() => onFilter("recent")}
					>
						Recent
					</Filter>
					<Filter
						active={filter === "shared"}
						onClick={() => onFilter("shared")}
					>
						Shared
					</Filter>
					<select
						aria-label="Sort testimonies"
						className="ml-auto h-8 rounded-md border bg-background px-2 text-sm"
						onChange={(event) => onSort(event.target.value as Sort)}
						value={sort}
					>
						<option value="recent">Most recent</option>
						<option value="oldest">Oldest</option>
						<option value="title">Title A–Z</option>
					</select>
				</div>
			</CardHeader>
			<CardContent className="px-3 pb-2">
				{loading ? (
					<p className="p-4 text-muted-foreground text-sm">
						Loading testimonies…
					</p>
				) : null}
				{!loading && testimonies.length === 0 ? (
					<Empty className="min-h-72">
						<EmptyHeader>
							<EmptyTitle>No testimonies found</EmptyTitle>
							<EmptyDescription>Try another search or filter.</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					testimonies.map((item) => (
						<button
							className={`flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left ${item.id === selectedId ? "bg-muted/65 ring-1 ring-primary/10" : "hover:bg-muted/40"}`}
							key={item.id}
							onClick={() => onSelect(item.id)}
							type="button"
						>
							<div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
								<BookOpenIcon className="size-5" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate font-serif text-sm">{item.title}</p>
								<p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
									{getReflectionExcerpt(item.content)}
								</p>
								<div className="mt-2 flex gap-1">
									{item.passages.slice(0, 2).map((passage) => (
										<Badge key={passage.id} variant="secondary">
											{passage.title ?? "Scripture"}
										</Badge>
									))}
								</div>
							</div>
							<span className="shrink-0 text-[11px] text-muted-foreground">
								{formatDate(item.createdAt)}
							</span>
							<ChevronRightIcon className="size-4 text-muted-foreground" />
						</button>
					))
				)}
			</CardContent>
		</Card>
	);
}

function TestimonyDetail({
	onShare,
	testimony,
}: {
	onShare: (id: number) => void;
	testimony: Testimony | null;
}) {
	if (!testimony)
		return (
			<Card className="hidden min-h-96 rounded-xl xl:flex">
				<Empty>
					<EmptyHeader>
						<EmptyTitle>No testimonies yet</EmptyTitle>
						<EmptyDescription>
							Record the stories you want to remember — what happened, what you
							learned, and where you saw God&apos;s faithfulness.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</Card>
		);
	return (
		<aside className="hidden xl:block">
			<Card className="gap-0 rounded-xl py-2 shadow-sm ring-foreground/8 xl:sticky xl:top-6">
				<CardContent className="p-5">
					<div className="flex items-start justify-between gap-3">
						<div>
							<h2 className="font-serif text-2xl">{testimony.title}</h2>
							<p className="mt-1 text-muted-foreground text-xs">
								{formatDate(testimony.createdAt)}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								render={
									<Link
										params={{ testimonyId: testimony.id }}
										to="/library/testimonials/$testimonyId/edit"
									/>
								}
								size="sm"
								variant="outline"
							>
								<PencilIcon /> Edit
							</Button>
							{!testimony.sharedToCommunity ? (
								<Button onClick={() => onShare(testimony.id)} size="sm">
									Share
								</Button>
							) : null}
							<span className="flex items-center gap-1 text-muted-foreground text-xs">
								{testimony.sharedToCommunity ? (
									<UsersIcon className="size-3.5" />
								) : (
									<LockKeyholeIcon className="size-3.5" />
								)}
								{testimony.sharedToCommunity
									? "Shared to Community"
									: "Private"}
							</span>
						</div>
					</div>
					<div className="mt-5">
						<RichTextRenderer
							document={parseReflectionContent(testimony.content)}
							preset="member"
						/>
					</div>
					{testimony.passages.length > 0 ? (
						<section className="mt-7 rounded-lg bg-muted/60 p-4">
							<h3 className="flex items-center gap-2 font-serif text-lg">
								<BookOpenIcon className="size-4 text-primary" /> Related
								Scripture
							</h3>
							<div className="mt-3 flex flex-wrap gap-2">
								{testimony.passages.map((passage) => (
									<Badge key={passage.id} variant="secondary">
										{passage.title ?? "Scripture"}
									</Badge>
								))}
							</div>
						</section>
					) : null}
					<p className="mt-4 text-muted-foreground text-xs">
						Related records: {testimony.prayerCount} prayers ·{" "}
						{testimony.noteCount} notes
					</p>
				</CardContent>
			</Card>
		</aside>
	);
}
function Filter({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: string;
	onClick: () => void;
}) {
	return (
		<Button
			onClick={onClick}
			size="sm"
			type="button"
			variant={active ? "default" : "outline"}
		>
			{children}
		</Button>
	);
}
function LoadError({ onRetry }: { onRetry: () => void }) {
	return (
		<Card>
			<Empty className="min-h-72">
				<EmptyHeader>
					<EmptyTitle>We couldn&apos;t load your testimonies.</EmptyTitle>
				</EmptyHeader>
				<Button onClick={onRetry}>Try again</Button>
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
