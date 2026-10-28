import { Button } from "@berean-study/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, BookOpenIcon, PlusIcon } from "lucide-react";

/* What the detail page shows while loading, or when it can't show the collection. */

export function CollectionDetailState({
	description,
	onRetry,
	title,
}: {
	description: string;
	onRetry?: () => void;
	title: string;
}) {
	return (
		<div className="min-h-full bg-background px-4 py-8 text-foreground sm:px-8">
			<main className="mx-auto w-full max-w-295">
				<Link
					className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-muted-foreground text-sm hover:text-foreground"
					to="/library/collections"
				>
					<ArrowLeftIcon aria-hidden="true" className="size-4" />
					Collections
				</Link>
				<Empty className="mt-6 rounded-2xl border border-border bg-card py-12">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<BookOpenIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>
							<h1>{title}</h1>
						</EmptyTitle>
						<EmptyDescription>{description}</EmptyDescription>
					</EmptyHeader>
					{onRetry ? (
						<EmptyContent>
							<Button
								className="h-11 px-4 text-sm"
								onClick={onRetry}
								type="button"
							>
								Try again
							</Button>
						</EmptyContent>
					) : null}
				</Empty>
			</main>
		</div>
	);
}

export function CollectionDetailSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-live="polite"
			className="min-h-full bg-background px-4 py-8 sm:px-8"
		>
			<span className="sr-only">Loading collection</span>
			<main
				aria-hidden="true"
				className="mx-auto flex w-full max-w-295 flex-col gap-8"
			>
				<Skeleton className="h-5 w-48 rounded-md" />
				<Skeleton className="h-64 w-full rounded-[22px]" />
				<Skeleton className="h-12 w-full max-w-md rounded-md" />
				<div className="flex flex-wrap gap-8">
					<div className="flex flex-[999_1_35rem] flex-col gap-3">
						<Skeleton className="h-32 rounded-[14px]" />
						<Skeleton className="h-32 rounded-[14px]" />
					</div>
					<Skeleton className="h-48 flex-[1_1_18.75rem] rounded-2xl" />
				</div>
			</main>
		</div>
	);
}

/** The Passages tab of a collection with nothing in it yet. */
export function NoPassagesState({ onAdd }: { onAdd: () => void }) {
	return (
		<Empty className="rounded-2xl border border-border bg-card py-12">
			<EmptyHeader>
				<EmptyMedia
					className="size-14 rounded-full bg-secondary text-primary"
					variant="icon"
				>
					<BookOpenIcon aria-hidden="true" />
				</EmptyMedia>
				<EmptyTitle className="font-serif text-xl">No passages yet</EmptyTitle>
				<EmptyDescription className="max-w-md text-sm">
					Add the passages you want to study. The first one becomes this
					collection&apos;s cover.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent className="flex-row flex-wrap justify-center gap-2.5">
				<Button
					className="h-11 rounded-xl px-4 text-sm"
					onClick={onAdd}
					type="button"
				>
					<PlusIcon aria-hidden="true" data-icon="inline-start" />
					Add your first passage
				</Button>
			</EmptyContent>
		</Empty>
	);
}
