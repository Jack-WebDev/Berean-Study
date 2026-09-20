import type { ReaderHomeOverview } from "@berean-study/db/reader-home";
import { Button } from "@berean-study/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import {
	ArrowRightIcon,
	BookMarkedIcon,
	BookOpenIcon,
	Clock3Icon,
	SparklesIcon,
} from "lucide-react";
import { RecentlyStudied } from "./recently-studied";

const startingPoints = [
	{
		description:
			"Discover who Jesus is through John's account of his life, teaching, death, and resurrection.",
		eyebrow: "Gospel",
		image:
			"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=90",
		title: "The Gospel of John",
	},
	{
		description:
			"Explore grace, faith, sin, justification, and the righteousness of God.",
		eyebrow: "Pauline Epistle",
		image:
			"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=90",
		title: "Romans",
	},
	{
		description:
			"Prayer, worship, sorrow, hope, trust, and praise for every season of life.",
		eyebrow: "Poetry & Wisdom",
		image:
			"https://images.unsplash.com/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=1200&q=90",
		title: "Psalms",
	},
	{
		description:
			"Faithfulness, unity, worship, holiness, love, and resurrection.",
		eyebrow: "Pauline Epistle",
		image:
			"https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=90",
		title: "1 Corinthians",
	},
] as const;

export default function HomePage({
	overview,
}: {
	overview: ReaderHomeOverview | null;
}) {
	const hasReadingActivity =
		Boolean(overview?.continueReading) ||
		(overview?.recentlyRead.length ?? 0) > 0;

	return (
		<main className="min-h-full bg-background text-foreground">
			<Hero hasReadingActivity={hasReadingActivity} overview={overview} />

			<div className="mx-auto max-w-350 px-5 py-8 sm:px-8 sm:py-10 lg:px-8 lg:py-12">
				<div className="space-y-12 sm:space-y-14">
					<StartingPoints />

					{hasReadingActivity && overview ? (
						<RecentlyStudied overview={overview} />
					) : (
						<GettingStarted />
					)}

					<ScriptureMoment />
				</div>
			</div>
		</main>
	);
}

function Hero({
	hasReadingActivity,
	overview,
}: {
	hasReadingActivity: boolean;
	overview: ReaderHomeOverview | null;
}) {
	const continueReading = overview?.continueReading;
	const mostRecent = overview?.recentlyRead[0];

	const currentTitle =
		mostRecent?.title ?? mostRecent?.bookName ?? "Continue your study";

	return (
		<section className="relative isolate overflow-hidden border-border/60 border-b">
			<img
				alt=""
				className="absolute inset-0 -z-30 size-full object-cover object-center"
				src="https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=2400&q=92"
			/>

			<div className="absolute inset-0 -z-20 bg-black/15" />

			<div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--background)_30%,transparent)_0%,color-mix(in_oklch,var(--background)_8%,transparent)_45%,color-mix(in_oklch,var(--foreground)_35%,transparent)_100%)]" />

			<div className="relative mx-auto flex min-h-105 max-w-350 items-end px-5 pt-10 pb-8 sm:min-h-120 sm:px-8 sm:pb-10 lg:min-h-126 lg:px-8">
				<div className="grid w-full gap-8 lg:grid-cols-[1fr_280px] lg:items-end">
					<div className="max-w-3xl">
						{hasReadingActivity ? (
							<>
								<div className="flex items-center gap-2">
									<span className="h-px w-7 bg-white/60" />
									<p className="font-medium text-[11px] text-white/75 uppercase tracking-[0.22em]">
										Continue Reading
									</p>
								</div>

								<h1 className="mt-4 max-w-2xl text-balance font-serif text-4xl text-white tracking-[-0.045em] drop-shadow-sm sm:text-5xl lg:text-[3.5rem] lg:leading-[1.02]">
									{currentTitle}
								</h1>

								<p className="mt-3 max-w-xl text-balance text-sm text-white/75 leading-6 sm:text-base">
									Return to Scripture and continue from where you left off.
								</p>

								<div className="mt-7 flex flex-wrap gap-3">
									<Button
										className="h-11 rounded-lg bg-white px-5 text-neutral-950 shadow-sm hover:bg-white/90"
										render={
											<a
												href={
													continueReading
														? `/bible?passage=${continueReading.passageId}`
														: "/bible"
												}
											/>
										}
									>
										<BookOpenIcon aria-hidden="true" className="size-4" />
										Continue Reading
									</Button>

									<Button
										className="h-11 rounded-lg border-white/25 bg-white/10 px-5 text-white backdrop-blur-md hover:bg-white/15 hover:text-white"
										render={<a href="/bible" />}
										variant="outline"
									>
										Browse Scripture
									</Button>
								</div>
							</>
						) : (
							<>
								<div className="flex items-center gap-2">
									<span className="h-px w-7 bg-white/60" />
									<p className="font-medium text-[11px] text-white/75 uppercase tracking-[0.22em]">
										Berean Study
									</p>
								</div>

								<h1 className="mt-4 max-w-3xl text-balance font-serif text-4xl text-white tracking-[-0.045em] drop-shadow-sm sm:text-5xl lg:text-[3.5rem] lg:leading-[1.02]">
									A deeper understanding of Scripture.
								</h1>

								<p className="mt-3 max-w-xl text-balance text-sm text-white/75 leading-6 sm:text-base">
									Read the biblical text in context, explore careful commentary,
									and go deeper when the passage calls for it.
								</p>

								<div className="mt-7">
									<Button
										className="h-11 rounded-lg bg-white px-5 text-neutral-950 shadow-sm hover:bg-white/90"
										render={<a href="/bible" />}
									>
										Begin Reading
										<ArrowRightIcon aria-hidden="true" className="size-4" />
									</Button>
								</div>
							</>
						)}
					</div>

					<blockquote className="hidden border-white/20 border-l pl-5 text-white/80 lg:block">
						<p className="font-serif text-sm italic leading-6">
							“Search the Scriptures daily to see if these things are so.”
						</p>

						<footer className="mt-3 font-medium text-[10px] text-white/60 uppercase tracking-[0.18em]">
							Acts 17:11
						</footer>
					</blockquote>
				</div>
			</div>
		</section>
	);
}

function StartingPoints() {
	const [featured, ...secondary] = startingPoints;

	return (
		<section aria-labelledby="starting-points-title">
			<SectionHeader
				description="A few places worth beginning if you're looking for somewhere to study."
				href="/bible"
				linkLabel="Browse all Scripture"
				title="Explore a Popular Starting Point"
			/>

			<div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
				<FeaturedStartingPoint item={featured} />

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
					{secondary.map((item) => (
						<SecondaryStartingPoint item={item} key={item.title} />
					))}
				</div>
			</div>
		</section>
	);
}

function FeaturedStartingPoint({
	item,
}: {
	item: (typeof startingPoints)[number];
}) {
	return (
		<a
			className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			href="/bible"
		>
			<Card className="relative h-full overflow-hidden rounded-2xl border-border/50 py-0 shadow-[0_8px_30px_rgb(15_23_42/0.08)]">
				<img
					alt=""
					className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
					src={item.image}
				/>

				<div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-black/5" />

				<div className="relative flex min-h-95 flex-col justify-end p-6 sm:p-7">
					<p className="font-medium text-[10px] text-white/65 uppercase tracking-[0.2em]">
						{item.eyebrow}
					</p>

					<h3 className="mt-2 max-w-lg font-serif text-3xl text-white tracking-[-0.035em] sm:text-4xl">
						{item.title}
					</h3>

					<p className="mt-2 max-w-lg text-sm text-white/70 leading-6">
						{item.description}
					</p>

					<span className="mt-5 inline-flex items-center gap-2 font-medium text-sm text-white">
						Begin here
						<ArrowRightIcon
							aria-hidden="true"
							className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
						/>
					</span>
				</div>
			</Card>
		</a>
	);
}

function SecondaryStartingPoint({
	item,
}: {
	item: (typeof startingPoints)[number];
}) {
	return (
		<a
			className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			href="/bible"
		>
			<Card className="grid min-h-29 grid-cols-[112px_1fr] overflow-hidden rounded-2xl border-border/60 py-0 shadow-[0_3px_16px_rgb(15_23_42/0.05)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgb(15_23_42/0.09)] sm:grid-cols-[130px_1fr]">
				<div className="overflow-hidden">
					<img
						alt=""
						className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
						src={item.image}
					/>
				</div>

				<CardHeader className="min-w-0 justify-center gap-0 px-4 py-4">
					<p className="font-medium text-[9px] text-muted-foreground uppercase tracking-[0.16em]">
						{item.eyebrow}
					</p>

					<CardTitle className="mt-1.5 font-serif text-lg tracking-[-0.02em]">
						{item.title}
					</CardTitle>

					<CardDescription className="mt-1 line-clamp-2 text-xs leading-5">
						{item.description}
					</CardDescription>

					<span className="mt-2 inline-flex items-center gap-1 font-medium text-primary text-xs">
						Explore
						<ArrowRightIcon
							aria-hidden="true"
							className="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
						/>
					</span>
				</CardHeader>
			</Card>
		</a>
	);
}

function GettingStarted() {
	return (
		<section>
			<SectionHeader
				description="Berean Study is designed to become deeper as you need it to."
				title="Study at Your Own Pace"
			/>

			<div className="mt-6 grid gap-4 sm:grid-cols-3">
				<FeatureCard
					description="Begin with the biblical text before moving into interpretation."
					icon={<BookOpenIcon className="size-4" />}
					title="Read"
				/>

				<FeatureCard
					description="Understand the literary and historical context surrounding the passage."
					icon={<Clock3Icon className="size-4" />}
					title="Understand"
				/>

				<FeatureCard
					description="Open deeper language, textual, and interpretive material when you need it."
					icon={<SparklesIcon className="size-4" />}
					title="Go Deeper"
				/>
			</div>
		</section>
	);
}

function FeatureCard({
	description,
	icon,
	title,
}: {
	description: string;
	icon: React.ReactNode;
	title: string;
}) {
	return (
		<Card className="rounded-2xl border-border/60 py-0 shadow-[0_3px_16px_rgb(15_23_42/0.04)]">
			<CardHeader className="px-5 py-5">
				<div className="grid size-9 place-items-center rounded-full bg-primary/8 text-primary">
					{icon}
				</div>

				<CardTitle className="mt-3 font-serif text-lg">{title}</CardTitle>

				<CardDescription className="mt-1 text-sm leading-6">
					{description}
				</CardDescription>
			</CardHeader>
		</Card>
	);
}

function ScriptureMoment() {
	return (
		<section className="relative overflow-hidden rounded-2xl bg-secondary/55 px-6 py-9 sm:px-10 sm:py-11">
			<div className="absolute -top-10 -right-10 size-44 rounded-full bg-primary/5 blur-3xl" />

			<div className="relative mx-auto max-w-2xl text-center">
				<span className="mx-auto grid size-10 place-items-center rounded-full bg-background/70 text-primary shadow-sm">
					<BookMarkedIcon aria-hidden="true" className="size-4" />
				</span>

				<blockquote>
					<p className="mt-5 text-balance font-serif text-lg italic leading-8 tracking-[-0.015em] sm:text-xl">
						“All Scripture is God-breathed and is useful for teaching, for
						reproof, for correction, and for training in righteousness.”
					</p>

					<footer className="mt-4 font-medium text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
						2 Timothy 3:16
					</footer>
				</blockquote>
			</div>
		</section>
	);
}

function SectionHeader({
	description,
	href,
	linkLabel,
	title,
}: {
	description?: string;
	href?: string;
	linkLabel?: string;
	title: string;
}) {
	return (
		<div className="flex items-end justify-between gap-6">
			<div>
				<h2 className="font-serif text-2xl tracking-[-0.03em] sm:text-[1.7rem]">
					{title}
				</h2>

				{description ? (
					<p className="mt-1.5 max-w-xl text-muted-foreground text-sm leading-6">
						{description}
					</p>
				) : null}
			</div>

			{href && linkLabel ? (
				<a
					className="hidden shrink-0 items-center gap-1.5 font-medium text-primary text-xs transition-colors hover:text-primary/70 sm:inline-flex"
					href={href}
				>
					{linkLabel}
					<ArrowRightIcon aria-hidden="true" className="size-3.5" />
				</a>
			) : null}
		</div>
	);
}
