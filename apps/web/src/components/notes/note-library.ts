import {
	getDocumentText,
	isSectionHeading,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";

import type { NotePurpose, NoteSort } from "./types";

/** Untitled notes borrow this many opening words as their list title. */
const BORROWED_TITLE_WORDS = 6;
/** Fewer words than this aren't worth borrowing, so the note shows "Untitled". */
const MIN_BORROWED_TITLE_WORDS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Purposes in the order the editor offers them. */
export const notePurposes: ReadonlyArray<{
	label: string;
	value: NotePurpose;
}> = [
	{ label: "Observation", value: "observation" },
	{ label: "Reflection", value: "reflection" },
	{ label: "Application", value: "application" },
	{ label: "Prayer", value: "prayer" },
];

export function purposeLabel(purpose: NotePurpose) {
	return (
		notePurposes.find((option) => option.value === purpose)?.label ?? purpose
	);
}

export const sortLabels: Record<NoteSort, string> = {
	created: "Date created",
	title: "Title A–Z",
	updated: "Recently edited",
};

/**
 * The title and preview the notes list shows. An untitled note uses its
 * opening words as the title and the preview carries on from there, so the
 * same words aren't shown twice.
 */
export function describeListItem(note: {
	content: RichTextDocument;
	title: string;
}) {
	// Section labels (Observe, Interpret…) would read as part of the sentence.
	const text = getDocumentText({
		...note.content,
		content: note.content.content?.filter((block) => !isSectionHeading(block)),
	});
	const title = note.title.trim();
	if (title) return { isUntitled: false, preview: text, title };

	const words = text.split(/\s+/).filter(Boolean);
	if (words.length < MIN_BORROWED_TITLE_WORDS)
		return { isUntitled: true, preview: text, title: "Untitled" };
	if (words.length <= BORROWED_TITLE_WORDS)
		return { isUntitled: false, preview: "", title: text };
	return {
		isUntitled: false,
		preview: `…${words.slice(BORROWED_TITLE_WORDS).join(" ")}`,
		title: `${words.slice(0, BORROWED_TITLE_WORDS).join(" ")}…`,
	};
}

export type NoteGroup<Note> = { label: string; notes: Note[] };

type GroupableNote = {
	createdAt: Date | string;
	pinnedAt: Date | string | null;
	updatedAt: Date | string;
};

/**
 * Splits an already-sorted list into the headings the library shows: pinned
 * notes first, then Today, Yesterday, Previous 7 days and month names. A
 * title sort has no dates to group by, so its notes stay in one group.
 */
export function groupNotes<Note extends GroupableNote>(
	notes: readonly Note[],
	sort: NoteSort,
	now = new Date(),
): NoteGroup<Note>[] {
	const groups: NoteGroup<Note>[] = [];
	const pinned = notes.filter((note) => note.pinnedAt);
	if (pinned.length) groups.push({ label: "Pinned", notes: pinned });

	const rest = notes.filter((note) => !note.pinnedAt);
	if (!rest.length) return groups;
	if (sort === "title") {
		groups.push({ label: "All notes", notes: rest });
		return groups;
	}

	const byLabel = new Map<string, Note[]>();
	for (const note of rest) {
		const label = dateGroupLabel(
			new Date(sort === "created" ? note.createdAt : note.updatedAt),
			now,
		);
		byLabel.set(label, [...(byLabel.get(label) ?? []), note]);
	}
	for (const [label, groupNotes] of byLabel)
		groups.push({ label, notes: groupNotes });
	return groups;
}

export function dateGroupLabel(date: Date, now = new Date()) {
	const daysAgo = calendarDaysBetween(date, now);
	if (daysAgo <= 0) return "Today";
	if (daysAgo === 1) return "Yesterday";
	if (daysAgo <= 7) return "Previous 7 days";
	return new Intl.DateTimeFormat("en", {
		month: "long",
		year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
	}).format(date);
}

/** The time of day for today's notes, otherwise a short date. */
export function formatListTime(value: Date | string, now = new Date()) {
	const date = new Date(value);
	if (calendarDaysBetween(date, now) <= 0) return formatTime(date);
	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
	}).format(date);
}

/** "Edited today at 12:58", "Edited yesterday at 09:15" or "Edited Oct 3". */
export function formatEdited(value: Date | string, now = new Date()) {
	const date = new Date(value);
	const daysAgo = calendarDaysBetween(date, now);
	if (daysAgo <= 0) return `Edited today at ${formatTime(date)}`;
	if (daysAgo === 1) return `Edited yesterday at ${formatTime(date)}`;
	return `Edited ${formatListTime(date, now)}`;
}

function formatTime(date: Date) {
	return new Intl.DateTimeFormat("en", {
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

/** Whole calendar days from `date` to `now`, ignoring the time of day. */
function calendarDaysBetween(date: Date, now: Date) {
	const startOfDay = (value: Date) =>
		new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
	return Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
}
