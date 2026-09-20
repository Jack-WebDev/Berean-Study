import type { ReaderHomeOverview } from "@berean-study/db/reader-home";
import { cn } from "@berean-study/ui/lib/utils";
import {
	ArrowRightIcon,
	BookOpenIcon,
	ChevronRightIcon,
	Clock3Icon,
} from "lucide-react";

export function RecentlyStudied({
	overview,
}: {
	overview: ReaderHomeOverview;
}) {
	const items = overview.recentlyRead.slice(0, 4);
	const [latest, ...rest] = items;

	if (!latest) {
		return null;
	}

	return (
		<section aria-labelledby="recently-studied-title">
			<div className="flex items-end justify-between gap-6">
				<div>
					<p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
						Your Study
					</p>

					<h2
						className="mt-1.5 font-serif text-2xl tracking-[-0.03em] sm:text-[1.75rem]"
						id="recently-studied-title"
					>
						Recently Studied
					</h2>
				</div>

				<a
					className="hidden items-center gap-1.5 font-medium text-primary text-xs transition-colors hover:text-primary/75 sm:inline-flex"
					href="/history"
				>
					View history
					<ArrowRightIcon aria-hidden="true" className="size-3.5" />
				</a>
			</div>

			<div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
				<FeaturedRecentStudyCard passage={latest} />

				<div className="grid gap-3">
					{rest.map((passage, index) => (
						<RecentStudyMiniCard
							index={index}
							key={`${passage.bookName}-${passage.visitedAt.toString()}`}
							passage={passage}
						/>
					))}
				</div>
			</div>

			<a
				className="mt-4 inline-flex items-center gap-1.5 font-medium text-primary text-xs transition-colors hover:text-primary/75 sm:hidden"
				href="/history"
			>
				View history
				<ArrowRightIcon aria-hidden="true" className="size-3.5" />
			</a>
		</section>
	);
}

function FeaturedRecentStudyCard({
	passage,
}: {
	passage: ReaderHomeOverview["recentlyRead"][number];
}) {
	return (
		<a
			className="group relative block overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--secondary)_88%,var(--background)),color-mix(in_oklch,var(--accent)_22%,var(--secondary)))] p-7 shadow-[0_10px_30px_color-mix(in_oklch,var(--foreground)_8%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_color-mix(in_oklch,var(--foreground)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-8"
			href="/history"
		>
			<div className="relative flex min-h-72.5 flex-col">
				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-wrap items-center gap-2">
						<span className="inline-flex items-center rounded-full border border-border/70 bg-background/65 px-3 py-1 font-medium text-[10px] text-foreground/70 uppercase tracking-[0.18em] backdrop-blur-sm">
							Most Recent
						</span>

						<span className="inline-flex items-center gap-1.5 rounded-full bg-background/65 px-3 py-1 text-muted-foreground text-xs shadow-sm backdrop-blur-sm">
							<Clock3Icon aria-hidden="true" className="size-3.5" />
							{relativeTime(passage.visitedAt)}
						</span>
					</div>

					<div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-border/60 bg-background/70 text-primary shadow-sm backdrop-blur-sm">
						<BookOpenIcon
							aria-hidden="true"
							className="size-5"
							strokeWidth={1.8}
						/>
					</div>
				</div>

				<div className="mt-8">
					<h3 className="max-w-xl text-balance font-serif text-4xl tracking-[-0.04em] sm:text-[2.65rem] sm:leading-[1.02]">
						{passage.title ?? passage.bookName}
					</h3>

					<p className="mt-3 max-w-lg text-muted-foreground text-sm leading-6 sm:text-[15px]">
						Return to this passage and continue where your study left off.
					</p>
				</div>

				<div className="mt-auto pt-10">
					<span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm transition-transform duration-200">
						Continue studying
						<ArrowRightIcon aria-hidden="true" className="size-4" />
					</span>
				</div>
			</div>
		</a>
	);
}

function RecentStudyMiniCard({
	index,
	passage,
}: {
	index: number;
	passage: ReaderHomeOverview["recentlyRead"][number];
}) {
	const variant = index % 3;

	return (
		<a
			className={cn(
				"group relative overflow-hidden rounded-2xl border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				variant === 0 &&
					"border-primary/15 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_5%,var(--background)),var(--card))]",
				variant === 1 &&
					"border-accent/25 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--accent)_12%,var(--background)),var(--card))]",
				variant === 2 &&
					"border-secondary bg-[linear-gradient(135deg,var(--secondary),var(--card))]",
			)}
			href="/history"
		>
			<div
				className={cn(
					"absolute inset-y-0 left-0 w-1",
					variant === 0 && "bg-primary/55",
					variant === 1 && "bg-accent/65",
					variant === 2 && "bg-muted-foreground/35",
				)}
			/>

			<div className="flex items-center gap-4">
				<div
					className={cn(
						"grid size-10 shrink-0 place-items-center rounded-xl border bg-background/70 shadow-sm",
						variant === 0 && "border-primary/15 text-primary",
						variant === 1 && "border-accent/30 text-foreground/70",
						variant === 2 && "border-border text-muted-foreground",
					)}
				>
					<BookOpenIcon
						aria-hidden="true"
						className="size-4"
						strokeWidth={1.8}
					/>
				</div>

				<div className="min-w-0 flex-1">
					<p className="truncate font-serif text-lg tracking-[-0.02em]">
						{passage.title ?? passage.bookName}
					</p>

					<p className="mt-1 text-muted-foreground text-xs">
						{relativeTime(passage.visitedAt)}
					</p>
				</div>

				<ChevronRightIcon
					aria-hidden="true"
					className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
				/>
			</div>
		</a>
	);
}

function relativeTime(value: Date) {
	const milliseconds = Date.now() - new Date(value).getTime();
	const hours = Math.max(0, Math.round(milliseconds / 3_600_000));

	if (hours < 1) {
		return "Just now";
	}

	if (hours < 24) {
		return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	}

	const days = Math.round(hours / 24);

	if (days < 7) {
		return `${days} day${days === 1 ? "" : "s"} ago`;
	}

	const weeks = Math.round(days / 7);

	if (weeks < 5) {
		return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
	}

	const months = Math.round(days / 30);

	return `${months} month${months === 1 ? "" : "s"} ago`;
}
