import type { ReaderHomeOverview } from "@berean-study/db/reader-home";
import { Button } from "@berean-study/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Separator } from "@berean-study/ui/components/separator";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";

export function ReturningUserHome({
	overview,
}: {
	overview: ReaderHomeOverview | null;
}) {
	return (
		<div className="px-5 py-8 sm:px-8 lg:px-12">
			<div className="mx-auto max-w-5xl">
				<ContinueReading overview={overview} />
				<RecentlyRead overview={overview} />
			</div>
		</div>
	);
}

function ContinueReading({
	overview,
}: {
	overview: ReaderHomeOverview | null;
}) {
	const current = overview?.continueReading;

	return (
		<section aria-labelledby="continue-reading-heading">
			<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
				Berean Study
			</p>
			<h1
				className="mt-2 font-serif text-3xl tracking-[-0.02em] sm:text-4xl"
				id="continue-reading-heading"
			>
				Continue Reading
			</h1>
			{current ? (
				<a
					className="mt-6 flex max-w-2xl items-center gap-4 border-border border-y py-5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					href={`/bible?passage=${current.passageId}`}
				>
					<BookOpenIcon
						aria-hidden="true"
						className="size-5 text-muted-foreground"
					/>
					<span className="min-w-0 flex-1">
						<span className="block font-serif text-xl">{current.bookName}</span>
						{current.title && (
							<span className="mt-1 block text-muted-foreground text-sm">
								{current.title}
							</span>
						)}
					</span>
					<ArrowRightIcon
						aria-hidden="true"
						className="size-4 text-muted-foreground"
					/>
				</a>
			) : (
				<Empty className="mt-6 min-h-48 max-w-2xl border-border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<BookOpenIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>Begin with Scripture</EmptyTitle>
						<EmptyDescription>
							Choose a book and your reading position will appear here.
						</EmptyDescription>
					</EmptyHeader>
					<Button render={<a href="/bible" />} size="sm" variant="outline">
						Browse Bible
					</Button>
				</Empty>
			)}
		</section>
	);
}

function RecentlyRead({ overview }: { overview: ReaderHomeOverview | null }) {
	const recentlyRead = overview?.recentlyRead ?? [];

	if (recentlyRead.length === 0) {
		return null;
	}

	return (
		<section
			aria-labelledby="recently-read-heading"
			className="mt-12 max-w-2xl"
		>
			<h2 className="font-serif text-2xl" id="recently-read-heading">
				Recent
			</h2>
			<div className="mt-4">
				{recentlyRead.map((passage, index) => (
					<div key={passage.passageId}>
						{index > 0 && <Separator />}
						<a
							className="flex items-center gap-4 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							href={`/bible?passage=${passage.passageId}`}
						>
							<BookOpenIcon
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
							<span className="min-w-0 flex-1">
								<span className="block font-medium text-sm">
									{passage.bookName}
								</span>
								{passage.title && (
									<span className="mt-0.5 block truncate text-muted-foreground text-sm">
										{passage.title}
									</span>
								)}
							</span>
							<ArrowRightIcon
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
						</a>
					</div>
				))}
			</div>
		</section>
	);
}
