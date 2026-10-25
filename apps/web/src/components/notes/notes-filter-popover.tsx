import { Button } from "@berean-study/ui/components/button";
import { Checkbox } from "@berean-study/ui/components/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@berean-study/ui/components/popover";
import {
	RadioGroup,
	RadioGroupItem,
} from "@berean-study/ui/components/radio-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@berean-study/ui/components/tooltip";
import { SlidersHorizontalIcon } from "lucide-react";
import { useId } from "react";

import { sortLabels } from "./note-library";
import type { NoteSort, NotesSearch } from "./types";

type FilterOption = { id: number; name: string };

const eyebrowClassName =
	"font-semibold text-muted-foreground text-xs uppercase tracking-[0.06em]";

/** How many book, collection and tag filters are switched on. */
export function countActiveFilters(search: NotesSearch) {
	return (
		(search.books?.length ?? 0) +
		(search.collections?.length ?? 0) +
		(search.tags?.length ?? 0)
	);
}

/**
 * The list's one filter control: sort order plus multi-select book,
 * collection and tag filters. It reads "Filter · n" while filters are on.
 */
export function NotesFilterPopover({
	books,
	collections,
	onChange,
	search,
	tags,
}: {
	books: readonly FilterOption[];
	collections: readonly FilterOption[];
	onChange: (next: Partial<NotesSearch>) => void;
	search: NotesSearch;
	tags: readonly FilterOption[];
}) {
	const sortId = useId();
	const activeCount = countActiveFilters(search);
	const trigger = activeCount ? (
		<Button
			className="h-10 shrink-0 rounded-[10px] border-border-strong px-3 font-medium text-secondary-foreground"
			type="button"
			variant="outline"
		>
			<SlidersHorizontalIcon aria-hidden="true" data-icon="inline-start" />
			Filter · {activeCount}
			<span className="sr-only"> filters on. Change filters and sort</span>
		</Button>
	) : (
		<Button
			aria-label="Filter and sort"
			className="size-10 shrink-0 rounded-[10px] border-border-strong text-secondary-foreground"
			size="icon"
			type="button"
			variant="outline"
		>
			<SlidersHorizontalIcon aria-hidden="true" />
		</Button>
	);

	return (
		<Popover>
			<Tooltip>
				<TooltipTrigger render={<PopoverTrigger render={trigger} />} />
				<TooltipContent>Filter &amp; sort</TooltipContent>
			</Tooltip>
			<PopoverContent
				align="end"
				className="max-h-[min(36rem,var(--available-height))] w-80 gap-5 overflow-y-auto rounded-xl p-4 text-sm"
			>
				<div className="flex flex-col gap-2">
					<span className={eyebrowClassName} id={sortId}>
						Sort by
					</span>
					<RadioGroup
						aria-labelledby={sortId}
						className="gap-0"
						onValueChange={(value) => onChange({ sort: value as NoteSort })}
						value={search.sort ?? "updated"}
					>
						{sortOrder.map((sort) => (
							<label
								className="flex min-h-9 cursor-pointer items-center gap-2.5"
								htmlFor={`${sortId}-${sort}`}
								key={sort}
							>
								<RadioGroupItem id={`${sortId}-${sort}`} value={sort} />
								{sortLabels[sort]}
							</label>
						))}
					</RadioGroup>
				</div>
				<FilterGroup
					label="Bible book"
					onChange={(ids) => onChange({ books: ids })}
					options={books}
					selected={search.books}
				/>
				<FilterGroup
					label="Collection"
					onChange={(ids) => onChange({ collections: ids })}
					options={collections}
					selected={search.collections}
				/>
				<FilterGroup
					label="Tag"
					onChange={(ids) => onChange({ tags: ids })}
					options={tags}
					selected={search.tags}
				/>
				{activeCount ? (
					<Button
						className="h-9 self-start rounded-lg"
						onClick={() =>
							onChange({
								books: undefined,
								collections: undefined,
								tags: undefined,
							})
						}
						type="button"
						variant="ghost"
					>
						Clear filters
					</Button>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

const sortOrder: readonly NoteSort[] = ["updated", "created", "title"];

function FilterGroup({
	label,
	onChange,
	options,
	selected = [],
}: {
	label: string;
	onChange: (ids: number[] | undefined) => void;
	options: readonly FilterOption[];
	selected?: readonly number[];
}) {
	const labelId = useId();
	if (!options.length) return null;

	const toggle = (id: number, checked: boolean) => {
		const next = checked
			? [...selected, id]
			: selected.filter((selectedId) => selectedId !== id);
		onChange(next.length ? next : undefined);
	};

	return (
		<fieldset aria-labelledby={labelId} className="flex flex-col gap-1.5">
			<span className={eyebrowClassName} id={labelId}>
				{label}
			</span>
			<ul className="flex max-h-44 flex-col overflow-y-auto">
				{options.map((option) => (
					<li key={option.id}>
						<label
							className="flex min-h-9 cursor-pointer items-center gap-2.5"
							htmlFor={`${labelId}-${option.id}`}
						>
							<Checkbox
								checked={selected.includes(option.id)}
								id={`${labelId}-${option.id}`}
								onCheckedChange={(checked) => toggle(option.id, checked)}
							/>
							<span className="truncate">{option.name}</span>
						</label>
					</li>
				))}
			</ul>
		</fieldset>
	);
}
