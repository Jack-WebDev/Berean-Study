import type { PermissionKey } from "@berean-study/db/access-catalogue";

/** Everyone whose work depends on the Bible's structure can read it. */
export function canReadScriptureData(permissionKeys: readonly PermissionKey[]) {
	return (
		permissionKeys.includes("scripture.manage") ||
		permissionKeys.includes("content.write") ||
		permissionKeys.includes("scripture.enter")
	);
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
