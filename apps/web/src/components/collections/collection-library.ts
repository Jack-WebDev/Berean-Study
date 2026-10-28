import type {
	CollectionSummary,
	CollectionType,
	CollectionVisibility,
} from "@berean-study/db/collections";

/*
 * Filtering, searching and sorting for the collections library. Kept free of
 * React so the rules can be tested directly.
 */

export type { CollectionSummary, CollectionType, CollectionVisibility };

export const collectionFilters = [
	{ label: "All", test: () => true, value: "all" },
	{ label: "Pinned", test: (c) => c.pinned, value: "pinned" },
	{
		label: "Study projects",
		test: (c) => c.type === "project",
		value: "project",
	},
	{
		label: "Scripture lists",
		test: (c) => c.type === "list",
		value: "list",
	},
	{
		label: "Teaching prep",
		test: (c) => c.type === "teaching",
		value: "teaching",
	},
	{
		label: "Shared with others",
		test: (c) => c.visibility !== "private",
		value: "shared",
	},
] as const satisfies readonly {
	label: string;
	test: (collection: CollectionSummary) => boolean;
	value: string;
}[];

export type CollectionFilter = (typeof collectionFilters)[number]["value"];

export const collectionSorts = [
	{ label: "Last updated", value: "updated" },
	{ label: "Name A–Z", value: "name" },
	{ label: "Most passages", value: "size" },
] as const;

export type CollectionSort = (typeof collectionSorts)[number]["value"];
export type CollectionView = "grid" | "list";

export const collectionTypes = [
	{ description: "Verses on a theme", label: "Scripture list", value: "list" },
	{
		description: "Sections + progress",
		label: "Study project",
		value: "project",
	},
	{
		description: "Outline + questions",
		label: "Teaching prep",
		value: "teaching",
	},
] as const satisfies readonly {
	description: string;
	label: string;
	value: CollectionType;
}[];

export const visibilityOptions = [
	{ description: "Only you", label: "Private", value: "private" },
	{
		description: "People or groups you invite",
		label: "Shared",
		value: "shared",
	},
	{ description: "Visible in Community", label: "Public", value: "public" },
] as const satisfies readonly {
	description: string;
	label: string;
	value: CollectionVisibility;
}[];

export function typeLabel(type: CollectionType) {
	return collectionTypes.find((option) => option.value === type)?.label ?? "";
}

export function visibilityLabel(visibility: CollectionVisibility) {
	return (
		visibilityOptions.find((option) => option.value === visibility)?.label ?? ""
	);
}

const nameCollator = new Intl.Collator("en", { sensitivity: "base" });

/** Matches the name, description, tags and the cover passage's reference. */
export function matchesSearch(collection: CollectionSummary, query: string) {
	const needle = query.trim().toLocaleLowerCase();
	if (!needle) return true;
	return [
		collection.name,
		collection.description,
		collection.cover?.reference ?? "",
		...collection.tags,
	]
		.join(" ")
		.toLocaleLowerCase()
		.includes(needle);
}

export function filterCollections(
	collections: readonly CollectionSummary[],
	filter: CollectionFilter,
	query: string,
) {
	const { test } =
		collectionFilters.find((option) => option.value === filter) ??
		collectionFilters[0];
	return collections.filter(
		(collection) => test(collection) && matchesSearch(collection, query),
	);
}

/** "Last updated" keeps pinned collections on top, as the design does. */
export function sortCollections(
	collections: readonly CollectionSummary[],
	sort: CollectionSort,
) {
	return [...collections].sort((left, right) => {
		if (sort === "name") return nameCollator.compare(left.name, right.name);
		if (sort === "size") {
			return (
				right.passageCount - left.passageCount ||
				nameCollator.compare(left.name, right.name)
			);
		}
		return (
			Number(right.pinned) - Number(left.pinned) ||
			new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
		);
	});
}

/** How many collections each filter chip would show. */
export function countByFilter(collections: readonly CollectionSummary[]) {
	return Object.fromEntries(
		collectionFilters.map((option) => [
			option.value,
			collections.filter((collection) => option.test(collection)).length,
		]),
	) as Record<CollectionFilter, number>;
}

export function pluralize(count: number, word: string) {
	return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "6 collections · 68 passages · 41 notes". */
export function summarizeLibrary(collections: readonly CollectionSummary[]) {
	const passages = collections.reduce(
		(total, collection) => total + collection.passageCount,
		0,
	);
	const notes = collections.reduce(
		(total, collection) => total + collection.noteCount,
		0,
	);
	return [
		pluralize(collections.length, "collection"),
		pluralize(passages, "passage"),
		pluralize(notes, "note"),
	].join(" · ");
}
