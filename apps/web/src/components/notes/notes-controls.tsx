import { Button } from "@berean-study/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { NoteBook, NoteCollection, NoteFilters, NoteTag } from "./types";

export function NotesControls({
	books,
	collections,
	filters,
	hasBookLoadError,
	hasTagLoadError,
	hasCollectionLoadError,
	isLoadingBooks,
	isLoadingCollections,
	isLoadingTags,
	onFiltersChange,
	tags,
}: {
	books: NoteBook[];
	collections: NoteCollection[];
	filters: NoteFilters;
	hasBookLoadError: boolean;
	hasCollectionLoadError: boolean;
	hasTagLoadError: boolean;
	isLoadingBooks: boolean;
	isLoadingCollections: boolean;
	isLoadingTags: boolean;
	onFiltersChange: (filters: NoteFilters) => void;
	tags: NoteTag[];
}) {
	const [query, setQuery] = useState(filters.query ?? "");

	useEffect(() => {
		setQuery(filters.query ?? "");
	}, [filters.query]);

	useEffect(() => {
		const nextQuery = query.trim();
		if (nextQuery === (filters.query ?? "")) return;

		const timeoutId = window.setTimeout(
			() =>
				onFiltersChange({
					bookId: filters.bookId,
					collectionId: filters.collectionId,
					passageId: filters.passageId,
					query: nextQuery || undefined,
					sort: filters.sort,
					tagId: filters.tagId,
				}),
			250,
		);

		return () => window.clearTimeout(timeoutId);
	}, [
		filters.bookId,
		filters.collectionId,
		filters.passageId,
		filters.query,
		filters.sort,
		filters.tagId,
		onFiltersChange,
		query,
	]);

	return (
		<div className="notes-filter-bar">
			{filters.passageId ? (
				<div className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
					<span>Showing notes for this passage</span>
					<Button
						onClick={() =>
							onFiltersChange({ ...filters, passageId: undefined })
						}
						size="xs"
						type="button"
						variant="ghost"
					>
						Clear
					</Button>
				</div>
			) : null}
			<label className="block" htmlFor="notes-search">
				<span className="sr-only">Search notes</span>
				<InputGroup>
					<InputGroupInput
						id="notes-search"
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search notes"
						type="search"
						value={query}
					/>
					<InputGroupAddon>
						<SearchIcon aria-hidden="true" />
					</InputGroupAddon>
				</InputGroup>
			</label>
			<div className="grid gap-2 sm:grid-cols-2">
				<label className="min-w-0" htmlFor="notes-book-filter">
					<span className="sr-only">Filter by book</span>
					<NativeSelect
						className="h-8 w-full text-xs"
						disabled={isLoadingBooks || hasBookLoadError}
						id="notes-book-filter"
						onChange={(event) =>
							onFiltersChange({
								...filters,
								bookId: event.target.value
									? Number(event.target.value)
									: undefined,
							})
						}
						value={filters.bookId?.toString() ?? ""}
					>
						<NativeSelectOption value="">
							{isLoadingBooks
								? "Loading books…"
								: hasBookLoadError
									? "Books unavailable"
									: "All books"}
						</NativeSelectOption>
						{books.map((book) => (
							<NativeSelectOption key={book.id} value={book.id}>
								{book.name}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</label>
				<label className="min-w-0" htmlFor="notes-collection-filter">
					<span className="sr-only">Filter by collection</span>
					<NativeSelect
						className="h-8 w-full text-xs"
						disabled={isLoadingCollections || hasCollectionLoadError}
						id="notes-collection-filter"
						onChange={(event) =>
							onFiltersChange({
								...filters,
								collectionId: event.target.value
									? Number(event.target.value)
									: undefined,
							})
						}
						value={filters.collectionId?.toString() ?? ""}
					>
						<NativeSelectOption value="">
							{isLoadingCollections
								? "Loading collections…"
								: hasCollectionLoadError
									? "Collections unavailable"
									: "All collections"}
						</NativeSelectOption>
						{collections.map((collection) => (
							<NativeSelectOption key={collection.id} value={collection.id}>
								{collection.name}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</label>
				<label className="min-w-0" htmlFor="notes-tag-filter">
					<span className="sr-only">Filter by tag</span>
					<NativeSelect
						className="h-8 w-full text-xs"
						disabled={isLoadingTags || hasTagLoadError}
						id="notes-tag-filter"
						onChange={(event) =>
							onFiltersChange({
								...filters,
								tagId: event.target.value
									? Number(event.target.value)
									: undefined,
							})
						}
						value={filters.tagId?.toString() ?? ""}
					>
						<NativeSelectOption value="">
							{isLoadingTags
								? "Loading tags…"
								: hasTagLoadError
									? "Tags unavailable"
									: "All tags"}
						</NativeSelectOption>
						{tags.map((tag) => (
							<NativeSelectOption key={tag.id} value={tag.id}>
								{tag.name}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</label>
				<label className="min-w-0" htmlFor="notes-sort">
					<span className="sr-only">Sort notes</span>
					<NativeSelect
						className="h-8 w-full text-xs"
						id="notes-sort"
						onChange={() =>
							onFiltersChange({ ...filters, sort: "updated-desc" })
						}
						value={filters.sort}
					>
						<NativeSelectOption value="updated-desc">
							Most recently updated
						</NativeSelectOption>
					</NativeSelect>
				</label>
			</div>
		</div>
	);
}
