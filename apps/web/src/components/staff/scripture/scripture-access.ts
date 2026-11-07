import type { PermissionKey } from "@berean-study/db/access-catalogue";

/** Everyone whose work depends on the Bible's structure can read it. */
export function canReadScriptureData(permissionKeys: readonly PermissionKey[]) {
	return (
		permissionKeys.includes("scripture.manage") ||
		permissionKeys.includes("content.write") ||
		permissionKeys.includes("scripture.enter")
	);
}

export const verseTextReaderPermissions = [
	"scripture.enter",
	"scripture.proofread",
	"scripture.manage",
	"translations.manage",
	"publication.publish",
] as const satisfies readonly PermissionKey[];

/** Unpublished wording is for the people working on it, not everyone who reads the structure. */
export function canReadVerseText(permissionKeys: readonly PermissionKey[]) {
	return verseTextReaderPermissions.some((key) => permissionKeys.includes(key));
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
