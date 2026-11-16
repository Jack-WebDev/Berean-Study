import type { RecentChapter } from "@berean-study/db/reader";
import { Separator } from "@berean-study/ui/components/separator";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { formatRelativeDay } from "@/utils/dates";

export type RecentlyStudiedState =
	| { status: "error" }
	| { status: "loading" }
	| { items: RecentChapter[]; status: "ready" };

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

function RecentlyStudiedList({ items }: { items: RecentChapter[] }) {
	return (
		<div className="mt-4">
			{items.map((recent, index) => (
				<div key={`${recent.book.slug}-${recent.chapter}`}>
					{index > 0 ? <Separator /> : null}
					<Link
						className="flex items-center gap-4 py-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						params={{ book: recent.book.slug, chapter: recent.chapter }}
						to="/bible/$book/$chapter"
					>
						<span className="min-w-0 flex-1">
							<span className="block truncate font-medium text-sm">
								{recent.label}
							</span>
						</span>
						<time
							className="shrink-0 text-muted-foreground text-sm"
							dateTime={recent.visitedAt.toISOString()}
						>
							{formatRelativeDay(recent.visitedAt)}
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
			Chapters you read in the Bible will appear here.
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
