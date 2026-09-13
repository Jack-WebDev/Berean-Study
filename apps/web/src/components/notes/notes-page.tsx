import { Button } from "@berean-study/ui/components/button";
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
import { useCallback, useEffect, useRef, useState } from "react";

import {
	addTagToNote,
	createNoteCollection,
	deleteNote,
	listNoteBooks,
	listNoteCollections,
	listNotes,
	listNoteTags,
	removeTagFromNote,
	setNoteCollection,
} from "@/functions/notes";

import { NoteDetail } from "./note-detail";
import { NotesControls } from "./notes-controls";
import { NotesList } from "./notes-list";
import type {
	Note,
	NoteBook,
	NoteCollection,
	NoteFilters,
	NoteTag,
} from "./types";

export function NotesPage({
	filters,
	onFiltersChange,
	onSelectNote,
	returnPassageId,
	selectedNoteId,
}: {
	filters: NoteFilters;
	onFiltersChange: (filters: NoteFilters) => void;
	onSelectNote: (noteId?: number) => void;
	returnPassageId?: number;
	selectedNoteId?: number;
}) {
	const navigate = useNavigate();
	const [notes, setNotes] = useState<Note[] | null>(null);
	const [books, setBooks] = useState<NoteBook[] | null>(null);
	const [collections, setCollections] = useState<NoteCollection[] | null>(null);
	const [tags, setTags] = useState<NoteTag[] | null>(null);
	const [hasLoadError, setHasLoadError] = useState(false);
	const [hasBookLoadError, setHasBookLoadError] = useState(false);
	const [hasCollectionLoadError, setHasCollectionLoadError] = useState(false);
	const [hasTagLoadError, setHasTagLoadError] = useState(false);
	const notesRequestId = useRef(0);
	const { bookId, collectionId, passageId, query, sort, tagId } = filters;
	const loadNotes = useCallback(async () => {
		const requestId = ++notesRequestId.current;
		setHasLoadError(false);

		try {
			const nextNotes = await listNotes({
				data: { bookId, collectionId, passageId, query, sort, tagId },
			});
			if (requestId === notesRequestId.current) setNotes(nextNotes);
		} catch {
			if (requestId === notesRequestId.current) setHasLoadError(true);
		}
	}, [bookId, collectionId, passageId, query, sort, tagId]);

	const loadBooks = useCallback(async () => {
		setHasBookLoadError(false);

		try {
			setBooks(await listNoteBooks());
		} catch {
			setHasBookLoadError(true);
		}
	}, []);

	const loadTags = useCallback(async () => {
		setHasTagLoadError(false);

		try {
			setTags(await listNoteTags());
		} catch {
			setHasTagLoadError(true);
		}
	}, []);

	const loadCollections = useCallback(async () => {
		setHasCollectionLoadError(false);

		try {
			setCollections(await listNoteCollections());
		} catch {
			setHasCollectionLoadError(true);
		}
	}, []);

	useEffect(() => {
		void loadNotes();
	}, [loadNotes]);

	useEffect(() => {
		void loadBooks();
	}, [loadBooks]);

	useEffect(() => {
		void loadTags();
	}, [loadTags]);

	useEffect(() => {
		void loadCollections();
	}, [loadCollections]);

	const selectedNote =
		notes?.find((note) => note.id === selectedNoteId) ?? notes?.[0] ?? null;

	const handleDelete = useCallback(
		async (noteId: number) => {
			const deleted = await deleteNote({ data: { id: noteId } });
			if (!deleted) throw new Error("Note not found.");

			if (!notes) return;
			const deletedIndex = notes.findIndex((note) => note.id === noteId);
			const remainingNotes = notes.filter((note) => note.id !== noteId);
			const nextNote =
				remainingNotes[deletedIndex] ?? remainingNotes[deletedIndex - 1];

			setNotes(remainingNotes);
			onSelectNote(nextNote?.id);
		},
		[notes, onSelectNote],
	);

	const handleAddTag = useCallback(async (noteId: number, name: string) => {
		const tag = await addTagToNote({ data: { id: noteId, name } });
		setNotes((currentNotes) =>
			currentNotes
				? currentNotes.map((note) =>
						note.id === noteId &&
						!note.tags.some((existingTag) => existingTag.id === tag.id)
							? { ...note, tags: [...note.tags, tag] }
							: note,
					)
				: null,
		);
		setTags((currentTags) => {
			if (
				!currentTags ||
				currentTags.some((existingTag) => existingTag.id === tag.id)
			) {
				return currentTags;
			}

			return [...currentTags, tag].sort((left, right) =>
				left.name.localeCompare(right.name),
			);
		});
	}, []);

	const handleRemoveTag = useCallback(
		async (noteId: number, tagId: number) => {
			const removed = await removeTagFromNote({ data: { id: noteId, tagId } });
			if (!removed) throw new Error("Tag not found.");

			setNotes((currentNotes) =>
				currentNotes
					? currentNotes.map((note) =>
							note.id === noteId
								? { ...note, tags: note.tags.filter((tag) => tag.id !== tagId) }
								: note,
						)
					: null,
			);
			void loadTags();
		},
		[loadTags],
	);

	const handleCreateCollection = useCallback(async (name: string) => {
		const collection = await createNoteCollection({ data: { name } });
		setCollections((currentCollections) => {
			if (
				!currentCollections ||
				currentCollections.some(
					(existingCollection) => existingCollection.id === collection.id,
				)
			) {
				return currentCollections;
			}

			return [...currentCollections, collection].sort((left, right) =>
				left.name.localeCompare(right.name),
			);
		});
		return collection;
	}, []);

	const handleAssignCollection = useCallback(
		async (noteId: number, nextCollectionId: number | null) => {
			const assigned = await setNoteCollection({
				data: { collectionId: nextCollectionId, id: noteId },
			});
			if (!assigned) throw new Error("Note not found.");

			setNotes((currentNotes) =>
				currentNotes
					? currentNotes.map((note) =>
							note.id === noteId
								? {
										...note,
										collectionId: nextCollectionId,
										collectionName:
											collections?.find(
												(collection) => collection.id === nextCollectionId,
											)?.name ?? null,
									}
								: note,
						)
					: null,
			);
		},
		[collections],
	);

	return (
		<div className="min-h-full bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4">
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
						books={books ?? []}
						collections={collections ?? []}
						filters={filters}
						hasBookLoadError={hasBookLoadError}
						hasCollectionLoadError={hasCollectionLoadError}
						hasTagLoadError={hasTagLoadError}
						isLoadingBooks={books === null && !hasBookLoadError}
						isLoadingCollections={
							collections === null && !hasCollectionLoadError
						}
						isLoadingTags={tags === null && !hasTagLoadError}
						onFiltersChange={onFiltersChange}
						tags={tags ?? []}
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
								hasLoadError={hasLoadError}
								isLoading={notes === null && !hasLoadError}
								notes={notes ?? []}
								onRetry={() => void loadNotes()}
								onSelect={onSelectNote}
								selectedNoteId={selectedNote?.id ?? null}
							/>
						</aside>

						<main aria-label="Selected note" className="notes-detail-pane">
							<NoteDetail
								note={selectedNote}
								onAddTag={handleAddTag}
								collections={collections ?? []}
								onAssignCollection={handleAssignCollection}
								onCreateCollection={handleCreateCollection}
								onDelete={handleDelete}
								onEdit={(noteId) =>
									navigate({
										to: "/library/notes/$noteId/edit",
										params: { noteId },
									})
								}
								onRemoveTag={handleRemoveTag}
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
							{note ? (note.passageTitle ?? note.bookName) : "—"}
						</dd>
					</div>
					<div>
						<dt>
							<FileTextIcon aria-hidden="true" />
							Word count
						</dt>
						<dd>
							{note
								? `${note.content.trim().split(/\s+/).filter(Boolean).length} words`
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
