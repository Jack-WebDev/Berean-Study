import type { listCollectionsForNotes } from "@/functions/collections";
import type { listNotes, listNoteTags } from "@/functions/notes";

export type Note = Awaited<ReturnType<typeof listNotes>>[number];

export type NotePurpose = NonNullable<Note["purpose"]>;

export type NoteSort = "created" | "title" | "updated";

/** The library's tabs: every note, drafts only, or notes with a passage. */
export type NoteView = "all" | "drafts" | "linked";

/** The notes library's state, kept in the URL so it survives a reload. */
export type NotesSearch = {
	books?: number[];
	collections?: number[];
	/** The selected note. */
	note?: number;
	/** Shows only notes on this passage, e.g. when coming from the Bible. */
	passage?: number;
	q?: string;
	/** The passage to go back to in the Bible reader. */
	return?: number;
	sort?: NoteSort;
	tags?: number[];
	view?: NoteView;
};

/** Which editor field to focus when a library prompt opens the editor. */
export type NoteEditorFocus = "passage" | "purpose" | "tags" | "title";

export type NoteBook = {
	id: number;
	name: string;
};

export type NoteTag = Awaited<ReturnType<typeof listNoteTags>>[number];

export type NoteCollection = Awaited<
	ReturnType<typeof listCollectionsForNotes>
>[number];
