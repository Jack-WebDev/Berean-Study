import type { ReaderHomeOverview } from "@berean-study/db/reader-home";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";
import type { ComponentProps } from "react";
import {
	type LibraryDestinationCountsState,
	LibraryDestinations,
} from "./library-destinations";
import {
	RecentLibraryActivitySection,
	type RecentLibraryActivityState,
} from "./recent-library-activity";
import {
	RecentlyStudiedSection,
	type RecentlyStudiedState,
} from "./recently-studied";

export type ContinueReadingState =
	| {
			status: "error";
	  }
	| {
			status: "loading";
	  }
	| {
			continueReading: ReaderHomeOverview["continueReading"];
			lastStudiedAt: Date | null;
			status: "ready";
	  };

export function LibraryPage({
	continueReading,
	destinationCounts,
	recentActivity,
	recentlyStudied,
}: {
	continueReading: ContinueReadingState;
	destinationCounts: LibraryDestinationCountsState;
	recentActivity: RecentLibraryActivityState;
	recentlyStudied: RecentlyStudiedState;
}) {
	return (
		<div className="min-h-full px-5 py-6 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full min-w-0 max-w-270 flex-col gap-5">
				<header className="relative min-h-20">
					<h1 className="font-serif text-3xl tracking-[-0.02em] sm:text-4xl">
						Library
					</h1>
					<p className="mt-2 max-w-2xl text-muted-foreground">
						Your saved studies, notes, prayers, and reading activity.
					</p>
					<LibraryVerse />
				</header>

				<ContinueReading state={continueReading} />
				<RecentlyStudiedSection state={recentlyStudied} />
				<RecentLibraryActivitySection state={recentActivity} />
				<LibraryDestinations counts={destinationCounts} />
			</main>
		</div>
	);
}

function LibraryVerse() {
	return (
		<div className="pointer-events-none absolute top-0 right-0 hidden h-24 w-100 bg-[url('/library-verse-bg.png')] bg-cover bg-right bg-no-repeat xl:block">
			<div className="absolute top-0 left-0 z-10 max-w-44 text-muted-foreground text-xs italic leading-5">
				“Your word is a lamp to my feet and a light to my path.”
				<span className="mt-1 block not-italic">Psalm 119:105</span>
			</div>
		</div>
	);
}

function ContinueReading({ state }: { state: ContinueReadingState }) {
	if (state.status === "loading") {
		return <ContinueReadingLoading />;
	}

	if (state.status === "error") {
		return <ContinueReadingUnavailable />;
	}

	if (!state.continueReading) {
		return <BeginReading />;
	}

	const { bookName, passageId, title } = state.continueReading;

	return (
		<ReadingCard>
			<div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[color-mix(in_oklch,var(--accent),var(--foreground)_35%)]">
				<BookOpenIcon aria-hidden="true" className="size-7" strokeWidth={1.7} />
			</div>
			<div className="w-full min-w-0 flex-1 lg:w-auto">
				<h2 className="font-medium text-sm" id="continue-reading-heading">
					Continue Reading
				</h2>
				<p className="mt-1 font-serif text-2xl tracking-[-0.02em]">
					{bookName}
				</p>
				{title ? (
					<p className="text-muted-foreground text-sm">{title}</p>
				) : null}
				<p className="mt-1 text-muted-foreground text-sm">
					{state.lastStudiedAt
						? formatLastStudied(state.lastStudiedAt)
						: "Continue where you left off."}
				</p>
			</div>
			<Link
				className="group inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-serif text-primary-foreground text-sm shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-auto"
				search={{ passage: passageId }}
				to="/bible"
			>
				Continue Reading
				<ArrowRightIcon
					aria-hidden="true"
					className="size-4 transition-transform group-hover:translate-x-0.5"
				/>
			</Link>
		</ReadingCard>
	);
}

function formatLastStudied(value: Date) {
	const studiedAt = new Date(value);
	const today = new Date();
	const startOfToday = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
	);
	const startOfStudiedDay = new Date(
		studiedAt.getFullYear(),
		studiedAt.getMonth(),
		studiedAt.getDate(),
	);
	const daysAgo = Math.round(
		(startOfToday.getTime() - startOfStudiedDay.getTime()) / 86_400_000,
	);

	if (daysAgo <= 0) return "Last studied today";
	if (daysAgo === 1) return "Last studied yesterday";
	return `Last studied ${daysAgo} days ago`;
}

function BeginReading() {
	return (
		<ReadingCard>
			<div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[color-mix(in_oklch,var(--accent),var(--foreground)_35%)]">
				<BookOpenIcon aria-hidden="true" className="size-7" strokeWidth={1.7} />
			</div>
			<div className="w-full min-w-0 flex-1 lg:w-auto">
				<h2 className="font-medium text-sm" id="continue-reading-heading">
					Begin Reading
				</h2>
				<p className="mt-1 max-w-md text-muted-foreground text-sm leading-6">
					Choose a book or passage to begin studying Scripture.
				</p>
			</div>
			<Link
				className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg bg-primary px-5 font-serif text-primary-foreground text-sm shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-auto"
				to="/bible"
			>
				Browse Scripture
			</Link>
		</ReadingCard>
	);
}

function ContinueReadingLoading() {
	return (
		<ReadingCard aria-busy="true">
			<span className="sr-only" id="continue-reading-heading">
				Continue Reading
			</span>
			<Skeleton className="size-14 shrink-0 rounded-full" />
			<div className="w-full flex-1 lg:w-auto">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="mt-2 h-6 w-36" />
				<Skeleton className="mt-2 h-4 w-48" />
			</div>
			<Skeleton className="h-10 w-full lg:w-40" />
		</ReadingCard>
	);
}

function ContinueReadingUnavailable() {
	return (
		<ReadingCard>
			<div className="w-full min-w-0 flex-1 lg:w-auto">
				<h2 className="font-medium text-sm" id="continue-reading-heading">
					Continue Reading
				</h2>
				<p className="mt-1 max-w-md text-muted-foreground text-sm leading-6">
					Your reading position is unavailable right now. You can still continue
					studying Scripture.
				</p>
			</div>
			<Link
				className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg bg-primary px-5 font-serif text-primary-foreground text-sm shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-auto"
				to="/bible"
			>
				Browse Scripture
			</Link>
		</ReadingCard>
	);
}

function ReadingCard({ children, ...props }: ComponentProps<"section">) {
	return (
		<section
			aria-labelledby="continue-reading-heading"
			className="flex flex-col items-start gap-4 rounded-xl border bg-card/60 px-5 py-4 shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground),transparent_96%)] lg:min-h-30 lg:flex-row lg:items-center lg:gap-5"
			{...props}
		>
			{children}
		</section>
	);
}
