"use client";

import { Badge } from "@berean-study/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	FileTextIcon,
	HighlighterIcon,
	LockKeyholeIcon,
	UsersRoundIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { CollectionCover } from "./collection-cover";
import { type CollectionSummary, exampleCollections } from "./collection-data";
import { CollectionEmptyState } from "./collection-empty-state";

export function CollectionGrid({
	collections = exampleCollections,
	createAction,
	emptyState,
}: {
	collections?: readonly CollectionSummary[];
	createAction?: ReactNode;
	emptyState?: ReactNode;
}) {
	if (collections.length === 0) {
		return emptyState ?? <CollectionEmptyState createAction={createAction} />;
	}

	return (
		<section aria-label="Your collections" id="all-collections">
			<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
				{collections.map((collection) => (
					<CollectionCard
						collection={collection}
						key={collection.id ?? collection.name}
					/>
				))}
			</div>
		</section>
	);
}

function CollectionCard({ collection }: { collection: CollectionSummary }) {
	const CoverIcon = collection.icon;
	const VisibilityIcon =
		collection.visibility === "Shared" ? UsersRoundIcon : LockKeyholeIcon;
	const content = (
		<>
			<div className="relative aspect-[16/6] overflow-hidden">
				<CollectionCover
					className="size-full object-cover"
					src={collection.image}
				/>
				<div className="absolute top-3 left-3 flex size-8 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm">
					<CoverIcon aria-hidden="true" className="size-4" />
				</div>
			</div>
			<CardHeader className="gap-2 px-5 pt-4 pb-0">
				<CardTitle className="font-serif text-xl leading-tight tracking-[-0.02em]">
					<h2>{collection.name}</h2>
				</CardTitle>
				<CardDescription className="line-clamp-2 min-h-10 text-sm leading-5">
					{collection.description}
				</CardDescription>
			</CardHeader>
			<CardContent className="px-5 pt-4 pb-5">
				<CollectionCounts counts={collection.counts} />
			</CardContent>
			<CardFooter className="mt-auto justify-between border-0 px-5 pt-0 pb-5 text-muted-foreground text-xs">
				<span>{collection.updatedAt}</span>
				<span className="flex items-center gap-1.5">
					<VisibilityIcon aria-hidden="true" className="size-3.5" />
					{collection.visibility}
				</span>
			</CardFooter>
		</>
	);

	return (
		<Card className="h-full gap-0 rounded-xl border border-border/70 bg-card py-0 shadow-sm ring-0">
			{collection.id ? (
				<Link
					className="flex h-full flex-col transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					params={{ collectionId: collection.id.toString() }}
					to="/library/collections/$collectionId"
				>
					{content}
				</Link>
			) : (
				content
			)}
		</Card>
	);
}

function CollectionCounts({ counts }: { counts: CollectionSummary["counts"] }) {
	return (
		<div className="flex flex-wrap gap-2">
			{counts.passages ? (
				<Badge
					className="rounded-full bg-muted px-2 text-muted-foreground"
					variant="secondary"
				>
					<BookOpenIcon aria-hidden="true" data-icon="inline-start" />
					{counts.passages} passages
				</Badge>
			) : null}
			{counts.notes ? (
				<Badge
					className="rounded-full bg-muted px-2 text-muted-foreground"
					variant="secondary"
				>
					<FileTextIcon aria-hidden="true" data-icon="inline-start" />
					{counts.notes} notes
				</Badge>
			) : null}
			{counts.highlights ? (
				<Badge
					className="rounded-full bg-muted px-2 text-muted-foreground"
					variant="secondary"
				>
					<HighlighterIcon aria-hidden="true" data-icon="inline-start" />
					{counts.highlights} highlights
				</Badge>
			) : null}
		</div>
	);
}
