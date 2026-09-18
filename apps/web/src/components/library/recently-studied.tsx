import type { RecentPassage } from "@berean-study/db/reader-home";
import { Separator } from "@berean-study/ui/components/separator";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import { Link } from "@tanstack/react-router";

export type RecentlyStudiedState =
	| { status: "error" }
	| { status: "loading" }
	| { items: RecentPassage[]; status: "ready" };

export function RecentlyStudiedSection({
	state,
}: {
	state: RecentlyStudiedState;
}) {
	return (
		<section aria-labelledby="recently-studied-heading" className="max-w-3xl">
			<h2
				className="font-serif text-2xl tracking-[-0.015em]"
				id="recently-studied-heading"
			>
				Recently Studied
			</h2>
			{state.status === "loading" ? <RecentlyStudiedLoading /> : null}
			{state.status === "error" ? <RecentlyStudiedUnavailable /> : null}
			{state.status === "ready" ? (
				state.items.length > 0 ? (
					<RecentlyStudiedList items={state.items} />
				) : (
					<RecentlyStudiedEmpty />
				)
			) : null}
		</section>
	);
}

function RecentlyStudiedList({ items }: { items: RecentPassage[] }) {
	return (
		<div className="mt-4">
			{items.map((passage, index) => (
				<div key={`${passage.passageId}-${passage.visitedAt.toISOString()}`}>
					{index > 0 ? <Separator /> : null}
					<Link
						className="flex items-center gap-4 py-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						search={{ passage: passage.passageId }}
						to="/bible"
					>
						<span className="min-w-0 flex-1">
							<span className="block truncate font-medium text-sm">
								{passage.title ?? passage.bookName}
							</span>
						</span>
						<time
							className="shrink-0 text-muted-foreground text-sm"
							dateTime={passage.visitedAt.toISOString()}
						>
							{formatStudiedDate(passage.visitedAt)}
						</time>
					</Link>
				</div>
			))}
		</div>
	);
}

function RecentlyStudiedLoading() {
	return (
		<div aria-busy="true" className="mt-4">
			<Skeleton className="h-5 w-40" />
			<Separator className="my-4" />
			<Skeleton className="h-5 w-52" />
			<Separator className="my-4" />
			<Skeleton className="h-5 w-44" />
		</div>
	);
}

function RecentlyStudiedEmpty() {
	return (
		<p className="mt-4 max-w-md text-muted-foreground text-sm leading-6">
			Passages you study will appear here.
		</p>
	);
}

function RecentlyStudiedUnavailable() {
	return (
		<p className="mt-4 max-w-md text-muted-foreground text-sm leading-6">
			Your recent study history is unavailable right now.
		</p>
	);
}

function formatStudiedDate(value: Date) {
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

	if (daysAgo <= 0) return "Today";
	if (daysAgo === 1) return "Yesterday";

	return new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "short",
		year:
			studiedAt.getFullYear() === today.getFullYear() ? undefined : "numeric",
	}).format(studiedAt);
}
