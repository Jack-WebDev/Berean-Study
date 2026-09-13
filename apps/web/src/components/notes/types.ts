import type {
	listNoteCollections,
	listNotes,
	listNoteTags,
} from "@/functions/notes";

export type Note = Awaited<ReturnType<typeof listNotes>>[number];

export type NoteFilters = {
	bookId?: number;
	collectionId?: number;
	passageId?: number;
	query?: string;
	sort: "updated-desc";
	tagId?: number;
};

export type NoteBook = {
	id: number;
	name: string;
};

export type NoteTag = Awaited<ReturnType<typeof listNoteTags>>[number];

export type NoteCollection = Awaited<
	ReturnType<typeof listNoteCollections>
>[number];
