import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCatalogueBrowsing } from "../src/components/study-tools/use-catalogue-browsing";

type Filter = "all" | "old-testament";

const records = [
	{ category: "old-testament", title: "Covenant" },
	{ category: "new-testament", title: "Grace" },
] as const;

describe("useCatalogueBrowsing", () => {
	it("normalizes queries, combines page-owned filters, and resets both controls", () => {
		const { result } = renderHook(() =>
			useCatalogueBrowsing<(typeof records)[number], Filter>({
				initialFilter: "all",
				matchesFilter: (record, filter) =>
					filter === "all" || record.category === filter,
				matchesQuery: (record, normalizedQuery) =>
					record.title.toLowerCase().includes(normalizedQuery),
				records,
			}),
		);

		act(() => result.current.setQuery("  covenant  "));
		expect(result.current.visibleRecords).toEqual([records[0]]);

		act(() => result.current.setFilter("old-testament"));
		expect(result.current.filter).toBe("old-testament");

		act(() => result.current.reset());
		expect(result.current.filter).toBe("all");
		expect(result.current.query).toBe("");
		expect(result.current.visibleRecords).toEqual(records);
	});
});
