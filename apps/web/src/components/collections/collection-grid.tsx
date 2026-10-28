import type { ReactNode } from "react";

import { CollectionCard, CollectionTableRow } from "./collection-card";
import type { CollectionSummary, CollectionView } from "./collection-library";

/** The library's collections, as cards or as a table. */
export function CollectionGrid({
	collections,
	newCollectionTile,
	view,
}: {
	collections: readonly CollectionSummary[];
	/** Shown as the last card in the grid view. */
	newCollectionTile: ReactNode;
	view: CollectionView;
}) {
	if (view === "list") {
		return (
			<div className="overflow-hidden rounded-2xl border border-border bg-card">
				<table className="w-full table-fixed text-sm">
					<caption className="sr-only">Your collections</caption>
					<thead>
						<tr className="border-border-subtle border-b text-left font-bold text-muted-foreground text-xs uppercase tracking-wider">
							<th className="py-3 pr-3 pl-4 sm:pl-5" scope="col">
								Collection
							</th>
							<th className="hidden w-36 px-3 md:table-cell" scope="col">
								Type
							</th>
							<th className="hidden w-44 px-3 sm:table-cell" scope="col">
								Contents
							</th>
							<th className="hidden w-32 px-3 lg:table-cell" scope="col">
								Updated
							</th>
							<th className="hidden w-28 px-3 lg:table-cell" scope="col">
								Visibility
							</th>
							<th className="w-14" scope="col">
								<span className="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{collections.map((collection) => (
							<CollectionTableRow collection={collection} key={collection.id} />
						))}
					</tbody>
				</table>
			</div>
		);
	}

	return (
		<ul
			aria-label="Your collections"
			className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18.75rem),1fr))] gap-6"
		>
			{collections.map((collection) => (
				<li className="flex flex-col *:flex-1" key={collection.id}>
					<CollectionCard collection={collection} />
				</li>
			))}
			<li className="flex flex-col *:flex-1">{newCollectionTile}</li>
		</ul>
	);
}
