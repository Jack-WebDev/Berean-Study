import {
	type PermissionKey,
	scriptureDataReaders,
	verseTextReaders,
} from "@berean-study/db/access-catalogue";

export function canReadScriptureData(permissionKeys: readonly PermissionKey[]) {
	return scriptureDataReaders.some((key) => permissionKeys.includes(key));
}

export function canReadVerseText(permissionKeys: readonly PermissionKey[]) {
	return verseTextReaders.some((key) => permissionKeys.includes(key));
}

/** For example "2 of 16 chapters", or just "2 chapters" when the total isn't known. */
export function chapterProgressLabel(
	chapters: number,
	expectedChapters: number | null,
) {
	const total = expectedChapters ?? chapters;
	const noun = total === 1 ? "chapter" : "chapters";
	return expectedChapters
		? `${chapters} of ${expectedChapters} ${noun}`
		: `${chapters} ${noun}`;
}

export function verseCountLabel(verses: number) {
	return `${verses} ${verses === 1 ? "verse" : "verses"}`;
}
