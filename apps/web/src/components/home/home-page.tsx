import type { ReaderHomeOverview } from "@berean-study/db/reader-home";
import { Button } from "@berean-study/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { Separator } from "@berean-study/ui/components/separator";
import { cn } from "@berean-study/ui/lib/utils";
import {
	ArrowRightIcon,
	BookMarkedIcon,
	BookOpenIcon,
	ChevronRightIcon,
	Clock3Icon,
} from "lucide-react";

const popularStartingPoints = [
	{
		description: "Discover who Jesus is and what it means to follow him.",
		image:
			"https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=1200&q=85",
		title: "The Gospel of John",
	},
	{
		description: "Explore the riches of God’s grace.",
		image:
			"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
		title: "The Book of Romans",
	},
	{
		description: "Prayers for every season of life.",
		image:
			"https://images.unsplash.com/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=1200&q=85",
		title: "Psalms",
	},
	{
		description: "Faith for a complex world.",
		image:
			"https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=85",
		title: "1 Corinthians",
	},
] as const;

export default function HomePage({
	overview,
}: {
	overview: ReaderHomeOverview | null;
}) {
	const hasRecentlyViewed = (overview?.recentlyRead.length ?? 0) > 0;

	return (
		<div className="min-h-full bg-background text-foreground">
			<Hero overview={overview} />
			<section className="px-5 py-7 sm:px-8 sm:py-8 lg:px-8">
				<div className="mx-auto max-w-[1400px]">
					<SectionHeading
						href="/bible"
						title="Explore a Popular Starting Point"
					/>
					<div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{popularStartingPoints.map((item) => (
							<PopularPassageCard item={item} key={item.title} />
						))}
					</div>
					<div className="mt-5 grid gap-5 lg:grid-cols-2">
						{hasRecentlyViewed && <RecentlyViewed overview={overview} />}
						<DevotionalQuote expanded={!hasRecentlyViewed} />
					</div>
				</div>
			</section>
		</div>
	);
}

function Hero({ overview }: { overview: ReaderHomeOverview | null }) {
	const continueReading = overview?.continueReading;

	return (
		<section className="relative isolate overflow-hidden border-border/60 border-b">
			<img
				alt="Sunlight over mountains in the biblical landscape"
				className="absolute inset-0 -z-20 size-full object-cover object-center"
				src="https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=2400&q=90"
			/>
			<div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--background)_43%,transparent),color-mix(in_oklch,var(--background)_10%,transparent)_42%,color-mix(in_oklch,var(--foreground)_22%,transparent))]" />
			<div className="relative mx-auto max-w-[1400px] px-5 pt-8 pb-5 sm:px-8 sm:pt-9 lg:px-8 lg:pt-8 lg:pb-5">
				<blockquote className="absolute top-12 right-8 hidden w-48 text-right text-foreground/90 text-sm italic leading-5 xl:block">
					<p>“Search the Scriptures daily to see if these things are so.”</p>
					<footer className="mt-3 font-sans text-[10px] not-italic tracking-[0.18em]">
						— ACTS 17:11
					</footer>
				</blockquote>

				<div className="mx-auto max-w-4xl text-center">
					<p className="font-medium text-[10px] text-foreground/65 uppercase tracking-[0.34em] sm:text-xs">
						Scripture for a deeper tomorrow
					</p>
					<h1 className="mt-2 font-serif text-3xl tracking-[-0.045em] sm:text-5xl lg:whitespace-nowrap lg:text-[3.25rem] lg:leading-tight">
						Welcome to Berean Study
					</h1>
					<p className="mt-1.5 font-serif text-base text-foreground/75 sm:text-lg">
						A deeper understanding of Scripture. Always rooted in the text.
					</p>
				</div>

				<div className="mt-6 flex flex-wrap justify-center gap-3">
					<Button
						className="h-10 rounded-lg px-4 text-sm"
						render={<a href="/bible" />}
					>
						Browse Scripture
					</Button>
					<Button
						className="h-10 rounded-lg px-4 text-sm"
						render={
							<a
								href={
									continueReading
										? `/bible?passage=${continueReading.passageId}`
										: "/bible"
								}
							/>
						}
						variant="outline"
					>
						{continueReading ? "Continue Reading" : "Explore Scripture"}
					</Button>
				</div>
			</div>
		</section>
	);
}

function SectionHeading({ href, title }: { href: string; title: string }) {
	return (
		<div className="flex items-baseline justify-between gap-4">
			<h2 className="font-serif text-xl tracking-[-0.025em] sm:text-2xl">
				{title}
			</h2>
			<a
				className="inline-flex shrink-0 items-center gap-1.5 font-medium text-primary text-xs hover:text-primary/75"
				href={href}
			>
				View all passages{" "}
				<ArrowRightIcon aria-hidden="true" className="size-3.5" />
			</a>
		</div>
	);
}

function PopularPassageCard({
	item,
}: {
	item: (typeof popularStartingPoints)[number];
}) {
	return (
		<a
			className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			href="/bible"
		>
			<Card className="h-full gap-0 rounded-xl py-0 shadow-[0_2px_8px_rgb(30_42_58_/_08%)] transition-shadow group-hover:shadow-[0_7px_18px_rgb(30_42_58_/_13%)]">
				<img
					alt=""
					className="h-24 w-full object-cover sm:h-28"
					src={item.image}
				/>
				<CardHeader className="gap-0 px-3 py-2.5">
					<CardTitle className="font-serif text-[13px]">{item.title}</CardTitle>
					<CardDescription className="mt-0.5 line-clamp-2 text-[11px] leading-4">
						{item.description}
					</CardDescription>
				</CardHeader>
			</Card>
		</a>
	);
}

function RecentlyViewed({ overview }: { overview: ReaderHomeOverview | null }) {
	const rows = (overview?.recentlyRead ?? []).slice(0, 3).map((passage) => ({
		label: passage.title ?? passage.bookName,
		time: relativeTime(passage.visitedAt),
	}));
	return (
		<Card className="rounded-xl py-0 shadow-[0_2px_8px_rgb(30_42_58_/_06%)]">
			<CardHeader className="flex flex-row items-center gap-2 px-3.5 py-3">
				<Clock3Icon
					aria-hidden="true"
					className="size-4 text-primary"
					strokeWidth={1.8}
				/>
				<CardTitle className="font-serif text-base">Recently Viewed</CardTitle>
				<a
					className="ml-auto inline-flex items-center gap-1 text-primary text-xs hover:text-primary/75"
					href="/history"
				>
					View all history{" "}
					<ArrowRightIcon aria-hidden="true" className="size-3" />
				</a>
			</CardHeader>
			<CardContent className="px-3.5 pb-2.5">
				{rows.map((row, index) => (
					<div key={`${row.label}-${row.time}`}>
						{index > 0 ? <Separator /> : null}
						<a
							className="flex items-center gap-2.5 py-2 text-xs hover:text-primary"
							href="/history"
						>
							<BookOpenIcon
								aria-hidden="true"
								className="size-3.5 text-primary/80"
							/>
							<span className="min-w-0 flex-1 font-medium">{row.label}</span>
							<span className="text-muted-foreground">{row.time}</span>
							<ChevronRightIcon
								aria-hidden="true"
								className="size-3.5 text-muted-foreground"
							/>
						</a>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function DevotionalQuote({ expanded = false }: { expanded?: boolean }) {
	return (
		<blockquote
			className={cn(
				"flex min-h-44 flex-col items-center justify-center rounded-xl bg-secondary/75 px-6 py-5 text-center",
				expanded && "lg:col-span-2",
			)}
		>
			<span className="grid size-9 place-items-center rounded-full bg-accent/25 text-[color-mix(in_oklch,var(--accent),var(--foreground)_25%)]">
				<BookMarkedIcon aria-hidden="true" className="size-4" />
			</span>
			<p className="mt-3 max-w-md font-serif text-sm italic leading-6 sm:text-base">
				“All Scripture is God-breathed and is useful for teaching, for reproof,
				for correction, and for training in righteousness.”
			</p>
			<footer className="mt-2 font-medium text-[10px] text-muted-foreground tracking-[0.16em]">
				2 TIMOTHY 3:16
			</footer>
		</blockquote>
	);
}

function relativeTime(value: Date) {
	const hours = Math.max(
		0,
		Math.round((Date.now() - new Date(value).getTime()) / 3_600_000),
	);
	if (hours < 1) return "Just now";
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	const days = Math.round(hours / 24);
	return `${days} day${days === 1 ? "" : "s"} ago`;
}
