import { getDocumentText } from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	BarChart3Icon,
	CalendarIcon,
	Clock3Icon,
	CopyIcon,
	FileTextIcon,
	FolderPlusIcon,
	LinkIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { addTagToNote, deleteNote, removeTagFromNote } from "@/functions/notes";
import { collectionsForNotesQueryOptions } from "@/queries/collections";
import { collectionKeys, libraryKeys, noteKeys } from "@/queries/keys";
import {
	noteBooksQueryOptions,
	notesQueryOptions,
	noteTagsQueryOptions,
} from "@/queries/notes";
import { NoteDetail } from "./note-detail";
import { NotesControls } from "./notes-controls";
import { NotesList } from "./notes-list";
import type { Note, NoteFilters } from "./types";

export function NotesPage({
	filters,
	onFiltersChange,
	openCollectionPicker,
	onSelectNote,
	returnPassageId,
	selectedNoteId,
}: {
	filters: NoteFilters;
	onFiltersChange: (filters: NoteFilters) => void;
	openCollectionPicker?: boolean;
	onSelectNote: (noteId?: number) => void;
	returnPassageId?: number;
	selectedNoteId?: number;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { bookId, collectionId, passageId, query, sort, tagId } = filters;
	const notesQuery = useQuery({
		...notesQueryOptions({
			bookId,
			collectionId,
			passageId,
			query,
			sort,
			tagId,
		}),
		// Keep the current list on screen while a new filter loads.
		placeholderData: keepPreviousData,
	});
	const booksQuery = useQuery(noteBooksQueryOptions());
	const tagsQuery = useQuery(noteTagsQueryOptions());
	const collectionsQuery = useQuery(collectionsForNotesQueryOptions());
	const notes = notesQuery.data ?? null;

	const selectedNote =
		notes?.find((note) => note.id === selectedNoteId) ?? notes?.[0] ?? null;

	const deleteNoteMutation = useMutation({
		mutationFn: async (noteId: number) => {
			const deleted = await deleteNote({ data: { id: noteId } });
			if (!deleted) throw new Error("Note not found.");
		},
		onSuccess: async (_result, noteId) => {
			if (notes) onSelectNote(nextNoteAfterDelete(notes, noteId)?.id);
			queryClient.removeQueries({ queryKey: noteKeys.detail(noteId) });
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: noteKeys.all }),
				queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
				queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
			]);
		},
	});

	const addTagMutation = useMutation({
		mutationFn: ({ name, noteId }: { name: string; noteId: number }) =>
			addTagToNote({ data: { id: noteId, name } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
	});

	const removeTagMutation = useMutation({
		mutationFn: async ({
			noteId,
			tagId,
		}: {
			noteId: number;
			tagId: number;
		}) => {
			const removed = await removeTagFromNote({ data: { id: noteId, tagId } });
			if (!removed) throw new Error("Tag not found.");
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
	});

	return (
		<div className="min-h-full bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-360 flex-col gap-4">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 className="font-serif text-3xl tracking-[-0.03em] sm:text-[2.45rem]">
							Notes
						</h1>
						<p className="mt-1 max-w-2xl font-serif text-muted-foreground text-sm leading-6">
							Capture your insights from Scripture. Grow deeper in God’s Word,
							one note at a time.
						</p>
					</div>
					<Button
						className="self-start"
						render={<Link to="/library/notes/new" />}
					>
						<PlusIcon aria-hidden="true" data-icon="inline-start" />
						New note
					</Button>
				</header>

				<section aria-label="Notes workspace" className="notes-library-surface">
					<NotesControls
						books={booksQuery.data ?? []}
						collections={collectionsQuery.data ?? []}
						filters={filters}
						hasBookLoadError={booksQuery.isError}
						hasCollectionLoadError={collectionsQuery.isError}
						hasTagLoadError={tagsQuery.isError}
						isLoadingBooks={booksQuery.isPending}
						isLoadingCollections={collectionsQuery.isPending}
						isLoadingTags={tagsQuery.isPending}
						onFiltersChange={onFiltersChange}
						tags={tagsQuery.data ?? []}
					/>
					<div className="notes-library-grid">
						<aside className="notes-list-pane">
							<NotesList
								hasActiveFilters={Boolean(
									filters.bookId ||
										filters.collectionId ||
										filters.passageId ||
										filters.query ||
										filters.tagId,
								)}
								hasLoadError={notesQuery.isError}
								isLoading={notesQuery.isPending}
								notes={notes ?? []}
								onRetry={() => void notesQuery.refetch()}
								onSelect={onSelectNote}
								selectedNoteId={selectedNote?.id ?? null}
							/>
						</aside>

						<main aria-label="Selected note" className="notes-detail-pane">
							<NoteDetail
								note={selectedNote}
								onAddTag={async (noteId, name) => {
									await addTagMutation.mutateAsync({ name, noteId });
								}}
								openCollectionPicker={openCollectionPicker}
								onDelete={deleteNoteMutation.mutateAsync}
								onEdit={(noteId) =>
									navigate({
										to: "/library/notes/$noteId/edit",
										params: { noteId },
									})
								}
								onRemoveTag={(noteId, tagId) =>
									removeTagMutation.mutateAsync({ noteId, tagId })
								}
								onReturnToScripture={
									returnPassageId
										? () =>
												navigate({
													to: "/bible",
													search: { passage: returnPassageId },
												})
										: undefined
								}
							/>
						</main>
						<NotesInsightsRail note={selectedNote} notes={notes ?? []} />
					</div>
				</section>
			</div>
		</div>
	);
}

function NotesInsightsRail({
	note,
	notes,
}: {
	note: Note | null;
	notes: Note[];
}) {
	return (
		<aside className="notes-insights-rail" aria-label="Note information">
			<section className="notes-rail-card">
				<h2>Note Details</h2>
				<dl>
					<div>
						<dt>
							<CalendarIcon aria-hidden="true" />
							Created
						</dt>
						<dd>
							{note
								? new Intl.DateTimeFormat(undefined, {
										dateStyle: "medium",
									}).format(new Date(note.createdAt))
								: "—"}
						</dd>
					</div>
					<div>
						<dt>
							<Clock3Icon aria-hidden="true" />
							Last updated
						</dt>
						<dd>
							{note
								? new Intl.DateTimeFormat(undefined, {
										dateStyle: "medium",
									}).format(new Date(note.updatedAt))
								: "—"}
						</dd>
					</div>
					<div>
						<dt>
							<LinkIcon aria-hidden="true" />
							Related to
						</dt>
						<dd className="text-primary">
							{note
								? (note.passageTitle ?? note.bookName ?? "Unlinked note")
								: "—"}
						</dd>
					</div>
					<div>
						<dt>
							<FileTextIcon aria-hidden="true" />
							Word count
						</dt>
						<dd>
							{note
								? `${getDocumentText(note.content).split(/\s+/).filter(Boolean).length} words`
								: "—"}
						</dd>
					</div>
				</dl>
			</section>
			<section className="notes-rail-card">
				<h2>Quick Actions</h2>
				<div className="notes-quick-actions">
					<button type="button">
						<FolderPlusIcon aria-hidden="true" />
						Add to collection
					</button>
					<button type="button">
						<CopyIcon aria-hidden="true" />
						Copy as text
					</button>
					<button type="button">
						<FileTextIcon aria-hidden="true" />
						Print note
					</button>
					<button className="text-destructive" type="button">
						<Trash2Icon aria-hidden="true" />
						Delete note
					</button>
				</div>
			</section>
			<section className="notes-rail-card">
				<h2>
					<BarChart3Icon aria-hidden="true" />
					Study Insights
				</h2>
				<dl>
					<div>
						<dt>Total Notes</dt>
						<dd>{notes.length}</dd>
					</div>
					<div>
						<dt>This Month</dt>
						<dd>
							{
								notes.filter(
									(item) =>
										new Date(item.createdAt).getMonth() ===
										new Date().getMonth(),
								).length
							}
						</dd>
					</div>
				</dl>
				{note?.tags.length ? (
					<div className="notes-favorite-tags">
						{note.tags.map((tag) => (
							<span key={tag.id}>{tag.name}</span>
						))}
					</div>
				) : null}
			</section>
			<div className="notes-scripture-reminder">
				“Your word is a lamp to my feet and a light to my path.”
				<span>PSALM 119:105</span>
			</div>
		</aside>
	);
}

function nextNoteAfterDelete(notes: readonly Note[], noteId: number) {
	const deletedIndex = notes.findIndex((note) => note.id === noteId);
	const remainingNotes = notes.filter((note) => note.id !== noteId);
	return remainingNotes[deletedIndex] ?? remainingNotes[deletedIndex - 1];
}
