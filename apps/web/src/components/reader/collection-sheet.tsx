import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";

import { BottomSheet } from "@/components/reader-ui/bottom-sheet";
import { ReaderButton } from "@/components/reader-ui/button";
import { ReaderSkeleton } from "@/components/reader-ui/reader-skeleton";
import { collectionsForNotesQueryOptions } from "@/queries/collections";

/** Choose which of the member's collections to add the chosen verses to. */
export function CollectionSheet({
	onChoose,
	onOpenChange,
	open,
	reference,
}: {
	onChoose: (collection: { id: number; name: string }) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	reference: string;
}) {
	const collections = useQuery({
		...collectionsForNotesQueryOptions(),
		enabled: open,
	});

	return (
		<BottomSheet
			description={`Choose where to add ${reference}.`}
			kind="tall"
			onOpenChange={onOpenChange}
			open={open}
			title="Add to collection"
		>
			{collections.isPending ? (
				<ReaderSkeleton label="Finding your collections…" lines={3} />
			) : collections.isError ? (
				<p className="text-[17px] text-muted-foreground">
					We couldn't load your collections. Check your connection, then try
					again.
				</p>
			) : collections.data.length === 0 ? (
				<div className="flex flex-col gap-3">
					<p className="text-[17px] text-muted-foreground">
						You don't have any collections yet.
					</p>
					<ReaderButton
						render={<Link to="/library/collections" />}
						variant="primary"
					>
						Make a collection
					</ReaderButton>
				</div>
			) : (
				<ul className="flex flex-col gap-2">
					{collections.data.map((collection) => (
						<li key={collection.id}>
							<button
								className="reader-focus flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 text-left hover:bg-muted"
								onClick={() => onChoose(collection)}
								type="button"
							>
								<span className="min-w-0 flex-1 font-serif text-[19px]">
									{collection.name}
								</span>
								<ChevronRightIcon
									aria-hidden="true"
									className="size-5 shrink-0 text-muted-foreground"
								/>
							</button>
						</li>
					))}
				</ul>
			)}
		</BottomSheet>
	);
}
