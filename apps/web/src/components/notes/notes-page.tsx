import { Button } from "@berean-study/ui/components/button";
import { Tabs, TabsContent } from "@berean-study/ui/components/tabs";
import { useIsMobile } from "@berean-study/ui/hooks/use-mobile";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

import { collectionsForNotesQueryOptions } from "@/queries/collections";
import {
	noteBooksQueryOptions,
	noteQueryOptions,
	notesQueryOptions,
	noteTagsQueryOptions,
	noteViewCountsQueryOptions,
} from "@/queries/notes";

import { groupNotes } from "./note-library";
import { NoteReadingPane } from "./note-reading-pane";
import { usePassageOptions } from "./note-study-data";
import {
	NotesList,
	NotesListSkeleton,
	NotesListState,
	RetryButton,
} from "./notes-list";
import { NotesListHeader } from "./notes-list-header";
import type { Note, NotesSearch, NoteView } from "./types";

/**
 * The notes library: a list of notes beside a reading view of the selected
 * one. Narrow screens show only the list; a note opens on its own page.
 */
export function NotesPage({
	onSearchChange,
	search,
}: {
	onSearchChange: (next: NotesSearch, options?: { replace?: boolean }) => void;
	search: NotesSearch;
}) {
	const isNarrow = useIsMobile();
	const sort = search.sort ?? "updated";
	const view = search.view ?? "all";
	const filters = {
		bookIds: search.books,
		collectionIds: search.collections,
		passageId: search.passage,
		query: search.q,
		tagIds: search.tags,
	};

	// Keep the current list on screen while a new search or filter loads.
	const notesQuery = useQuery({
		...notesQueryOptions({ ...filters, sort, view }),
		placeholderData: keepPreviousData,
	});
	const viewCountsQuery = useQuery({
		...noteViewCountsQueryOptions(filters),
		placeholderData: keepPreviousData,
	});
	// Unfiltered, so "No notes yet" isn't confused with "nothing matches".
	const totalQuery = useQuery(noteViewCountsQueryOptions());
	const booksQuery = useQuery(noteBooksQueryOptions());
	const tagsQuery = useQuery(noteTagsQueryOptions());
	const collectionsQuery = useQuery(collectionsForNotesQueryOptions());
	const passageOptions = usePassageOptions();

	const notes = notesQuery.data ?? [];
	// The order rows appear in, with pinned notes first.
	const shownNotes = groupNotes(notes, sort).flatMap((group) => group.notes);
	const listedNote = search.note
		? notes.find((note) => note.id === search.note)
		: undefined;
	// A link can select a note the current filters hide; fetch it directly.
	const selectedNoteQuery = useQuery({
		...noteQueryOptions(search.note ?? 0),
		enabled: Boolean(search.note) && notesQuery.isSuccess && !listedNote,
	});
	const selectedNote: Note | null =
		listedNote ??
		(search.note ? selectedNoteQuery.data : undefined) ??
		shownNotes[0] ??
		null;

	const update = (next: Partial<NotesSearch>) =>
		onSearchChange({ ...search, ...next });
	const hasFilters = Boolean(
		search.q ||
			search.books?.length ||
			search.collections?.length ||
			search.tags?.length ||
			search.passage ||
			view !== "all",
	);
	const clearFilters = () =>
		onSearchChange({ note: search.note, return: search.return, sort });
	const selectAfterDelete = (deletedId: number) => {
		const index = shownNotes.findIndex((note) => note.id === deletedId);
		const remaining = shownNotes.filter((note) => note.id !== deletedId);
		const next = remaining[index] ?? remaining[index - 1];
		onSearchChange({ ...search, note: next?.id }, { replace: true });
	};

	return (
		// Inline-size containment stops one-line titles from widening the page
		// on phones; they truncate inside the list instead.
		<div className="contain-[inline-size] flex md:h-[calc(100svh-3.25rem)]">
			<Tabs
				className="flex min-w-0 flex-[1_1_22.5rem] flex-col gap-0 md:max-w-110 md:border-border md:border-r"
				onValueChange={(value) =>
					onSearchChange({
						...search,
						note: undefined,
						view: value === "all" ? undefined : (value as NoteView),
					})
				}
				value={view}
			>
				<section
					aria-label="Your notes"
					className="flex min-h-0 flex-1 flex-col"
				>
					<NotesListHeader
						books={booksQuery.data ?? []}
						collections={collectionsQuery.data ?? []}
						counts={viewCountsQuery.data}
						onSearchChange={update}
						passageLabel={
							passageOptions.data?.find(
								(passage) => passage.id === search.passage,
							)?.label ?? null
						}
						search={search}
						tags={tagsQuery.data ?? []}
						total={totalQuery.data?.all}
					/>
					<TabsContent
						className="min-h-0 flex-1 overflow-y-auto text-base"
						value={view}
					>
						{notesQuery.isError ? (
							<NotesListState
								action={
									<RetryButton onRetry={() => void notesQuery.refetch()} />
								}
								description="Unable to load your notes. Please try again."
								title="Notes unavailable"
							/>
						) : notesQuery.isPending ? (
							<NotesListSkeleton />
						) : totalQuery.data?.all === 0 ? (
							<NotesListState
								action={
									<Button
										className="h-10 rounded-[10px] px-4 font-semibold"
										nativeButton={false}
										render={<Link to="/library/notes/new" />}
									>
										<PlusIcon aria-hidden="true" data-icon="inline-start" />
										New note
									</Button>
								}
								description="Write down what you notice as you read, and it will gather here."
								title="Welcome to your notes"
							/>
						) : notes.length === 0 ? (
							<NotesListState
								action={
									hasFilters ? (
										<Button
											className="h-9"
											onClick={clearFilters}
											type="button"
											variant="link"
										>
											Clear filters
										</Button>
									) : undefined
								}
								description={
									search.q
										? `Nothing matches “${search.q}”.`
										: "No notes match these filters."
								}
								title="No matching notes"
							/>
						) : (
							<NotesList
								isNarrow={isNarrow}
								notes={notes}
								search={search}
								selectedNoteId={selectedNote?.id ?? null}
								sort={sort}
							/>
						)}
					</TabsContent>
				</section>
			</Tabs>

			<section
				aria-label="Note"
				className="hidden min-w-0 flex-1 overflow-y-auto bg-card md:block"
			>
				{selectedNote ? (
					<NoteReadingPane
						key={selectedNote.id}
						note={selectedNote}
						onDeleted={() => selectAfterDelete(selectedNote.id)}
						onDuplicated={(copyId) =>
							onSearchChange({ ...search, note: copyId }, { replace: true })
						}
					/>
				) : null}
			</section>
		</div>
	);
}
