import { entryOpenCanonSlugs } from "@berean-study/db/scripture-catalogue";

/**
 * The editor needs a tradition that's open for entry. A link to a specific book,
 * chapter or translation carries no tradition and goes straight to that text.
 */
export function opensEntryEditor({
	book,
	canon,
	chapter,
	t,
}: {
	book?: string;
	canon?: string;
	chapter?: number;
	t?: string;
}) {
	if (canon) return entryOpenCanonSlugs.includes(canon);
	return Boolean(book || chapter || t);
}
