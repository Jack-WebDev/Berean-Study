import type {
	CollectionNote,
	CollectionPassage,
	CollectionSection,
	PassageGroup,
} from "./use-collection-actions";

/*
 * A collection's passages laid out as columns: the unsectioned passages first,
 * then one column per section. Drag and drop and the "Move" menu both edit
 * this layout, then save it as `PassageGroup`s.
 */

export type PassageColumn = {
	ids: number[];
	/** "unsectioned", or "section-<id>"; also the column's drop target id. */
	key: string;
	sectionId: number | null;
	title: string | null;
};

export const unsectionedKey = "unsectioned";

export function sectionKey(sectionId: number | null) {
	return sectionId === null ? unsectionedKey : `section-${sectionId}`;
}

/**
 * Builds the columns in reading order. The unsectioned column is left out
 * when it's empty and the collection has sections.
 */
export function buildColumns(
	passages: readonly CollectionPassage[],
	sections: readonly CollectionSection[],
): PassageColumn[] {
	const idsIn = (sectionId: number | null) =>
		passages
			.filter((passage) => passage.sectionId === sectionId)
			.map((passage) => passage.passageId);
	const unsectioned = idsIn(null);
	return [
		...(unsectioned.length || sections.length === 0
			? [
					{
						ids: unsectioned,
						key: unsectionedKey,
						sectionId: null,
						title: null,
					},
				]
			: []),
		...sections.map((section) => ({
			ids: idsIn(section.id),
			key: sectionKey(section.id),
			sectionId: section.id,
			title: section.title,
		})),
	];
}

/** The column holding a passage, or the column whose key was given. */
export function findColumn(
	columns: readonly PassageColumn[],
	id: number | string,
) {
	return typeof id === "string"
		? columns.find((column) => column.key === id)
		: columns.find((column) => column.ids.includes(id));
}

/**
 * Moves a passage to `toIndex` in the column `toKey`, creating the
 * unsectioned column if it isn't shown yet. Returns new columns.
 */
export function movePassage(
	columns: readonly PassageColumn[],
	passageId: number,
	toKey: string,
	toIndex: number,
): PassageColumn[] {
	const withTarget = columns.some((column) => column.key === toKey)
		? columns
		: [
				{ ids: [], key: unsectionedKey, sectionId: null, title: null },
				...columns,
			];
	const removed = withTarget.map((column) => ({
		...column,
		ids: column.ids.filter((id) => id !== passageId),
	}));
	return removed.map((column) => {
		if (column.key !== toKey) return column;
		const ids = [...column.ids];
		ids.splice(Math.min(Math.max(toIndex, 0), ids.length), 0, passageId);
		return { ...column, ids };
	});
}

export function toGroups(columns: readonly PassageColumn[]): PassageGroup[] {
	return columns.map((column) => ({
		passageIds: column.ids,
		sectionId: column.sectionId,
	}));
}

export function sameLayout(
	left: readonly PassageColumn[],
	right: readonly PassageColumn[],
) {
	return (
		JSON.stringify(left.map((column) => [column.key, column.ids])) ===
		JSON.stringify(right.map((column) => [column.key, column.ids]))
	);
}

/** The first unread passage in reading order. */
export function findUpNext(passages: readonly CollectionPassage[]) {
	return passages.find((passage) => passage.readAt === null) ?? null;
}

/** Collection notes linked to a passage, newest first (as the server sends). */
export function notesForPassage(
	notes: readonly CollectionNote[],
	passageId: number,
) {
	return notes.filter((note) => note.passageIds.includes(passageId));
}

/**
 * A finished section folds down to its first two passages until the member
 * asks for the rest, so the list leads with what's still to read.
 */
export function visiblePassageIds(
	column: PassageColumn,
	readIds: ReadonlySet<number>,
	expanded: boolean,
) {
	const isFinished =
		column.ids.length > 2 && column.ids.every((id) => readIds.has(id));
	return expanded || !isFinished ? column.ids : column.ids.slice(0, 2);
}
