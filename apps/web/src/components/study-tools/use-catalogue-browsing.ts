import { useState } from "react";

type CatalogueBrowsingOptions<CatalogueRecord, Filter> = {
	initialFilter: Filter;
	matchesFilter: (record: CatalogueRecord, filter: Filter) => boolean;
	matchesQuery: (record: CatalogueRecord, normalizedQuery: string) => boolean;
	records: readonly CatalogueRecord[];
};

/**
 * Owns the common query, filter, and reset state for a catalogue. Pages keep
 * their record-specific matching rules and presentation local.
 */
export function useCatalogueBrowsing<CatalogueRecord, Filter>({
	initialFilter,
	matchesFilter,
	matchesQuery,
	records,
}: CatalogueBrowsingOptions<CatalogueRecord, Filter>) {
	const [filter, setFilter] = useState(initialFilter);
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const visibleRecords = records.filter(
		(record) =>
			matchesFilter(record, filter) && matchesQuery(record, normalizedQuery),
	);

	function reset() {
		setFilter(initialFilter);
		setQuery("");
	}

	return { filter, query, reset, setFilter, setQuery, visibleRecords };
}
