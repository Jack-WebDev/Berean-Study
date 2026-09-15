import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { ArrowRightIcon, FolderIcon } from "lucide-react";
import { CollectionCover } from "./collection-cover";
import type { CollectionSummary } from "./collection-data";

export function CollectionsSupportingContent({
	collections,
}: {
	collections: readonly CollectionSummary[];
}) {
	const recentlyUpdatedCollections = [...collections]
		.sort(
			(left, right) => (right.updatedAtValue ?? 0) - (left.updatedAtValue ?? 0),
		)
		.slice(0, 4);
	return (
		<div className="flex flex-col gap-8">
			<section
				aria-labelledby="collections-helper-heading"
				className="flex flex-col gap-5 rounded-xl bg-secondary p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
			>
				<div className="flex items-start gap-4">
					<div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
						<FolderIcon aria-hidden="true" className="size-5" />
					</div>
					<div>
						<h2
							className="font-serif text-xl tracking-[-0.02em]"
							id="collections-helper-heading"
						>
							Collections help you go deeper.
						</h2>
						<p className="mt-2 max-w-3xl text-muted-foreground text-sm leading-6">
							Save verses by topic, organize your notes, prepare for teaching,
							or keep track of study themes. Collections make it easy to find
							and revisit what matters most in your study of God&apos;s Word.
						</p>
					</div>
				</div>
			</section>

			<section aria-labelledby="recently-updated-heading">
				<div className="mb-4 flex items-center justify-between gap-4">
					<h2
						className="font-serif text-xl tracking-[-0.02em]"
						id="recently-updated-heading"
					>
						Recently Updated
					</h2>
					<a
						className="flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						href="#all-collections"
					>
						View all collections
						<ArrowRightIcon aria-hidden="true" className="size-4" />
					</a>
				</div>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{recentlyUpdatedCollections.map((collection) => (
						<Card
							className="flex-row items-center gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm ring-0"
							key={collection.name}
							size="sm"
						>
							<CollectionCover
								className="size-12 shrink-0 rounded-md object-cover"
								src={collection.image}
							/>
							<CardHeader className="min-w-0 flex-1 gap-1 p-0">
								<CardTitle className="truncate font-serif text-sm">
									<h3>{collection.name}</h3>
								</CardTitle>
								<CardDescription className="text-xs">
									{collection.updatedAt}
								</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</section>
		</div>
	);
}
