import { Button } from "@berean-study/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import { TabsList, TabsTrigger } from "@berean-study/ui/components/tabs";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { NotesFilterPopover } from "./notes-filter-popover";
import type { NotesSearch, NoteView } from "./types";

type FilterOption = { id: number; name: string };

const SEARCH_DELAY_MS = 250;

const views: ReadonlyArray<{ label: string; value: NoteView }> = [
	{ label: "All", value: "all" },
	{ label: "Drafts", value: "drafts" },
	{ label: "Linked", value: "linked" },
];

/**
 * The top of the list pane: title and count, New note, search, filters and
 * the All / Drafts / Linked tabs. It must sit inside the pane's `Tabs`.
 */
export function NotesListHeader({
	books,
	collections,
	counts,
	onSearchChange,
	passageLabel,
	search,
	tags,
	total,
}: {
	books: readonly FilterOption[];
	collections: readonly FilterOption[];
	counts: Record<NoteView, number> | undefined;
	onSearchChange: (next: Partial<NotesSearch>) => void;
	passageLabel: string | null;
	search: NotesSearch;
	tags: readonly FilterOption[];
	total: number | undefined;
}) {
	const chips = [
		...(search.passage
			? [
					{
						key: "passage",
						label: passageLabel ?? "This passage",
						remove: () => onSearchChange({ passage: undefined }),
					},
				]
			: []),
		...filterChips("book", books, search.books, (ids) =>
			onSearchChange({ books: ids }),
		),
		...filterChips("collection", collections, search.collections, (ids) =>
			onSearchChange({ collections: ids }),
		),
		...filterChips("tag", tags, search.tags, (ids) =>
			onSearchChange({ tags: ids }),
		),
	];

	return (
		<div className="flex flex-col gap-4 px-5 pt-6">
			{search.return ? (
				<Link
					className="-mb-2 flex min-h-9 w-fit items-center gap-1.5 rounded-lg pr-2 text-secondary-foreground text-sm hover:bg-secondary"
					search={{ passage: search.return }}
					to="/bible"
				>
					<ArrowLeftIcon aria-hidden="true" className="size-4" />
					Back to Scripture
				</Link>
			) : null}
			<div className="flex items-center gap-3">
				<h1 className="font-medium font-serif text-[2rem] leading-tight tracking-[-0.015em]">
					Notes
				</h1>
				{total !== undefined ? (
					<span className="text-muted-foreground text-sm">
						{total} {total === 1 ? "note" : "notes"}
					</span>
				) : null}
				<Button
					className="ml-auto h-10 rounded-[10px] px-4 font-semibold"
					nativeButton={false}
					render={<Link to="/library/notes/new" />}
				>
					<PlusIcon aria-hidden="true" data-icon="inline-start" />
					New note
				</Button>
			</div>

			<div className="flex items-center gap-2">
				<NotesSearchInput
					onQueryChange={(q) => onSearchChange({ q })}
					query={search.q}
				/>
				<NotesFilterPopover
					books={books}
					collections={collections}
					onChange={onSearchChange}
					search={search}
					tags={tags}
				/>
			</div>

			{/* The border sits on a wrapper: the app's rounded-control rule would
			    curve it if it were on the tab list itself. */}
			<div className="-mx-5 border-border border-b px-5">
				<TabsList
					aria-label="Show"
					className="h-auto w-auto justify-start gap-5"
					variant="line"
				>
					{views.map((view) => (
						<TabsTrigger
							className="h-10 flex-none px-0 text-sm after:bg-primary data-active:font-semibold data-active:text-primary"
							key={view.value}
							value={view.value}
						>
							{view.label}
							<span className="font-normal text-muted-foreground text-xs">
								{counts?.[view.value] ?? ""}
							</span>
						</TabsTrigger>
					))}
				</TabsList>
			</div>

			{chips.length ? (
				<ul
					aria-label="Active filters"
					className="-mt-1 flex flex-wrap gap-1.5"
				>
					{chips.map((chip) => (
						<li
							className="flex h-8 items-center gap-1 rounded-full bg-secondary pr-1 pl-3 text-[13px] text-secondary-foreground"
							key={chip.key}
						>
							<span className="max-w-48 truncate">{chip.label}</span>
							<button
								aria-label={`Remove filter: ${chip.label}`}
								className="flex size-6 items-center justify-center rounded-full hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
								onClick={chip.remove}
								type="button"
							>
								<XIcon aria-hidden="true" className="size-3" />
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

function filterChips(
	kind: string,
	options: readonly FilterOption[],
	selected: readonly number[] | undefined,
	onChange: (ids: number[] | undefined) => void,
) {
	return (selected ?? []).map((id) => {
		const label = options.find((option) => option.id === id)?.name ?? "Filter";
		return {
			key: `${kind}-${id}`,
			label,
			remove: () => {
				const next = (selected ?? []).filter((selectedId) => selectedId !== id);
				onChange(next.length ? next : undefined);
			},
		};
	});
}

/** Filters as you type, waiting for a short pause before updating the URL. */
function NotesSearchInput({
	onQueryChange,
	query = "",
}: {
	onQueryChange: (query: string | undefined) => void;
	query?: string;
}) {
	const [value, setValue] = useState(query);
	// Held in a ref so a parent re-render doesn't restart the pause.
	const onQueryChangeRef = useRef(onQueryChange);
	onQueryChangeRef.current = onQueryChange;

	useEffect(() => setValue(query), [query]);

	useEffect(() => {
		const next = value.trim();
		if (next === query) return;
		const timeoutId = window.setTimeout(
			() => onQueryChangeRef.current(next || undefined),
			SEARCH_DELAY_MS,
		);
		return () => window.clearTimeout(timeoutId);
	}, [query, value]);

	return (
		<label className="min-w-0 flex-1" htmlFor="notes-search">
			<span className="sr-only">Search notes</span>
			<InputGroup className="h-10 rounded-[10px] border-border-strong bg-card">
				<InputGroupInput
					id="notes-search"
					onChange={(event) => setValue(event.target.value)}
					placeholder="Search notes"
					type="search"
					value={value}
				/>
				<InputGroupAddon>
					<SearchIcon aria-hidden="true" />
				</InputGroupAddon>
			</InputGroup>
		</label>
	);
}
