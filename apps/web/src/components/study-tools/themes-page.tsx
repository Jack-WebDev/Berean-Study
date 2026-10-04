import { cn } from "@berean-study/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	BarChart3Icon,
	BookOpenIcon,
	Building2Icon,
	CircleUserRoundIcon,
	CrossIcon,
	FlameIcon,
	GiftIcon,
	Globe2Icon,
	LandmarkIcon,
	Layers3Icon,
	LeafIcon,
	LinkIcon,
	SearchIcon,
	ShieldIcon,
	SparklesIcon,
	UsersRoundIcon,
} from "lucide-react";
import { useState } from "react";

type ThemeFilter =
	| "all"
	| "church"
	| "foundational"
	| "gospel"
	| "new-testament"
	| "old-testament";

type ThemeTone = "blue" | "gold" | "green" | "plum" | "red" | "teal" | "umber";

type Theme = {
	category: Exclude<ThemeFilter, "all">;
	description: string;
	icon: LucideIcon;
	id: string;
	name: string;
	references: readonly string[];
	tone: ThemeTone;
};

const filters = [
	{ label: "All Themes", value: "all" },
	{ label: "Old Testament", value: "old-testament" },
	{ label: "New Testament", value: "new-testament" },
	{ label: "Foundational", value: "foundational" },
	{ label: "Gospel", value: "gospel" },
	{ label: "Church", value: "church" },
] as const satisfies readonly {
	label: string;
	value: ThemeFilter;
}[];

const themes = [
	{
		category: "old-testament",
		description:
			"God's faithful commitments and relationships with his people throughout Scripture.",
		icon: BookOpenIcon,
		id: "covenant",
		name: "Covenant",
		references: ["Genesis 12:1–3", "Jer. 31:31–34"],
		tone: "gold",
	},
	{
		category: "old-testament",
		description:
			"God's dwelling with his people, from the tabernacle to the new creation.",
		icon: Building2Icon,
		id: "temple",
		name: "Temple",
		references: ["Exodus 25:8", "John 2:19–21"],
		tone: "green",
	},
	{
		category: "new-testament",
		description:
			"God's undeserved favor, the foundation of salvation and Christian life.",
		icon: GiftIcon,
		id: "grace",
		name: "Grace",
		references: ["Ephesians 2:8–9", "Titus 2:11"],
		tone: "plum",
	},
	{
		category: "foundational",
		description: "Trusting in God and his promises throughout Scripture.",
		icon: ShieldIcon,
		id: "faith",
		name: "Faith",
		references: ["Habakkuk 2:4", "Hebrews 11:1"],
		tone: "blue",
	},
	{
		category: "old-testament",
		description:
			"Godly insight for living in right relationship with God and others.",
		icon: SparklesIcon,
		id: "wisdom",
		name: "Wisdom",
		references: ["Proverbs 2:6", "James 1:5"],
		tone: "red",
	},
	{
		category: "gospel",
		description:
			"God's power to raise to new life, culminating in the resurrection of Jesus and our future hope.",
		icon: CrossIcon,
		id: "resurrection",
		name: "Resurrection",
		references: ["1 Corinthians 15:20", "Romans 6:4"],
		tone: "blue",
	},
	{
		category: "new-testament",
		description:
			"The Spirit's presence, work, and empowerment in God's redemptive plan.",
		icon: FlameIcon,
		id: "holy-spirit",
		name: "Holy Spirit",
		references: ["John 14:16–17", "Acts 1:8"],
		tone: "umber",
	},
	{
		category: "church",
		description:
			"God's renewal of all things, restoring creation and making all things new.",
		icon: Globe2Icon,
		id: "new-creation",
		name: "New Creation",
		references: ["2 Corinthians 5:17", "Revelation 21:1"],
		tone: "teal",
	},
] as const satisfies readonly Theme[];

const categories = [
	{
		count: "12 themes",
		icon: CircleUserRoundIcon,
		label: "God and His Character",
	},
	{
		count: "8 themes",
		icon: CrossIcon,
		label: "The Gospel",
	},
	{
		count: "10 themes",
		icon: UsersRoundIcon,
		label: "People and Community",
	},
	{
		count: "7 themes",
		icon: LeafIcon,
		label: "Creation and Restoration",
	},
	{
		count: "9 themes",
		icon: LandmarkIcon,
		label: "Living the Faith",
	},
] as const;

const toneClasses: Record<ThemeTone, string> = {
	blue: "bg-[#4088ad]",
	gold: "bg-[#d6a13a]",
	green: "bg-[#57916a]",
	plum: "bg-[#7650aa]",
	red: "bg-[#b95041]",
	teal: "bg-[#337f81]",
	umber: "bg-[#8d643e]",
};

export function ThemesPage() {
	const [filter, setFilter] = useState<ThemeFilter>("all");
	const [query, setQuery] = useState("");

	const normalizedQuery = query.trim().toLowerCase();

	const visibleThemes = themes.filter((theme) => {
		const matchesFilter = filter === "all" || theme.category === filter;

		const searchableText = [
			theme.name,
			theme.description,
			theme.category.replaceAll("-", " "),
			...theme.references,
		]
			.join(" ")
			.toLowerCase();

		return matchesFilter && searchableText.includes(normalizedQuery);
	});

	function resetFilters() {
		setFilter("all");
		setQuery("");
	}

	function selectFilter(nextFilter: ThemeFilter) {
		if (nextFilter === "all") {
			resetFilters();
			return;
		}

		setFilter(nextFilter);
	}

	return (
		<main className="min-h-full bg-[#fbfaf6] dark:bg-background">
			<div className="mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-10 lg:py-10">
				<div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
					<div className="min-w-0">
						<ThemesHeader
							filter={filter}
							onFilterChange={selectFilter}
							onQueryChange={setQuery}
							query={query}
						/>

						<FeaturedTheme />

						<section aria-labelledby="theme-catalogue-heading" className="mt-6">
							<h2 className="sr-only" id="theme-catalogue-heading">
								Themes
							</h2>

							{visibleThemes.length > 0 ? (
								<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
									{visibleThemes.map((theme) => (
										<ThemeCard key={theme.id} theme={theme} />
									))}
								</div>
							) : (
								<ThemeEmptyState onReset={resetFilters} />
							)}
						</section>
					</div>

					<ThemesGuide />
				</div>

				<BrowseCategories onViewAll={resetFilters} />
			</div>
		</main>
	);
}

function ThemesHeader({
	filter,
	onFilterChange,
	onQueryChange,
	query,
}: {
	filter: ThemeFilter;
	onFilterChange: (filter: ThemeFilter) => void;
	onQueryChange: (query: string) => void;
	query: string;
}) {
	return (
		<header>
			<p className="font-semibold text-[#29435e] text-[10px] uppercase tracking-[0.08em] dark:text-primary">
				Study Tools
			</p>

			<h1 className="mt-2 font-serif text-[#18324f] text-[42px] leading-none tracking-[-0.035em] dark:text-foreground">
				Themes
			</h1>

			<p className="mt-4 max-w-[680px] text-[#405873] text-[15px] leading-[1.6] dark:text-muted-foreground">
				Trace major ideas across Scripture. Explore how key themes develop
				throughout the Bible, see related passages, and gain a deeper, more
				unified understanding of God's Word.
			</p>

			<div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
				<label className="relative min-w-0 flex-1" htmlFor="theme-search">
					<span className="sr-only">Search themes</span>

					<SearchIcon
						aria-hidden="true"
						className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#718297]"
						strokeWidth={1.8}
					/>

					<input
						className="h-8.5 w-full rounded-lg border border-[#e2ded7] bg-white py-2 pr-3 pl-9 text-[#294562] text-[11px] shadow-[0_1px_3px_rgba(24,50,79,0.04)] outline-none placeholder:text-[#8795a5] focus:border-[#cab98f] focus:ring-2 focus:ring-[#d8c79e]/25 dark:border-border dark:bg-card dark:text-foreground"
						id="theme-search"
						onChange={(event) => onQueryChange(event.target.value)}
						placeholder="Search themes, topics, or concepts..."
						type="search"
						value={query}
					/>
				</label>

				<div className="flex flex-wrap gap-2">
					{filters.map((item) => (
						<button
							aria-pressed={filter === item.value}
							className={cn(
								"h-9 rounded-full border px-3.5 text-[11px] transition-colors",
								filter === item.value
									? "border-[#eadcbf] bg-[#f7edd8] font-medium text-[#76592d]"
									: "border-[#e4e0da] bg-white text-[#5d7188] hover:bg-[#f8f6f2]",
							)}
							key={item.value}
							onClick={() => onFilterChange(item.value)}
							type="button"
						>
							{item.label}
						</button>
					))}
				</div>
			</div>
		</header>
	);
}

function FeaturedTheme() {
	const references = [
		"Daniel 7:13–14",
		"Matthew 4:17",
		"Luke 17:20–21",
		"Revelation 11:15",
	] as const;

	return (
		<section className="relative mt-8 min-h-[290px] overflow-hidden rounded-lg border border-[#e4dfd7] bg-[#f8f5ef] sm:min-h-[310px]">
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[url('/landing/cta-hills.png')] bg-cover bg-right-center bg-no-repeat"
			/>

			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[linear-gradient(90deg,#fbfaf6_0%,#fbfaf6_32%,rgba(251,250,246,0.96)_44%,rgba(251,250,246,0.72)_56%,rgba(251,250,246,0.16)_74%,transparent_88%)] dark:bg-[linear-gradient(90deg,var(--card)_0%,var(--card)_45%,rgba(0,0,0,0.18)_70%,transparent_90%)]"
			/>

			<div className="relative z-10 max-w-[600px] px-7 py-7 sm:px-10 sm:py-9">
				<p className="flex items-center gap-1.5 font-semibold text-[#9d7431] text-[10px] uppercase tracking-[0.05em]">
					<span aria-hidden="true">★</span>
					Featured Theme
				</p>

				<h2 className="mt-2 font-serif text-[#18324f] text-[38px] leading-none tracking-[-0.03em] dark:text-foreground">
					Kingdom of God
				</h2>

				<p className="mt-3 max-w-[540px] text-[#536980] text-[13px] leading-[1.6] dark:text-muted-foreground">
					The kingdom of God is God's sovereign rule and reign, breaking into
					the present age and culminating in the renewal of all things. It
					appears throughout Scripture as a central theme, from the promises to
					Israel to the teachings of Jesus and the hope of future consummation.
				</p>

				<div className="mt-5 flex flex-wrap gap-2">
					{references.map((reference) => (
						<span
							className="rounded-md border border-[#e2e5e5]/70 bg-white/70 px-2 py-1 text-[#5d738b] text-[9px] shadow-sm backdrop-blur-sm"
							key={reference}
						>
							{reference}
						</span>
					))}
				</div>

				<button
					className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#bd8c37] px-5 font-medium text-[12px] text-white shadow-sm transition-colors hover:bg-[#ad7f31]"
					type="button"
				>
					Explore theme
					<ArrowRightIcon className="size-3.5" strokeWidth={1.8} />
				</button>
			</div>
		</section>
	);
}

function ThemeCard({ theme }: { theme: Theme }) {
	const Icon = theme.icon;

	return (
		<article className="group flex min-h-[190px] flex-col rounded-lg border border-[#e7e3dd] bg-white p-5 shadow-[0_2px_7px_rgba(24,50,79,0.045)] dark:border-border dark:bg-card dark:shadow-none">
			<div className="flex gap-4">
				<div
					className={cn(
						"flex size-11 shrink-0 items-center justify-center rounded-md text-white shadow-sm",
						toneClasses[theme.tone],
					)}
				>
					<Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
				</div>

				<div className="min-w-0">
					<h3 className="font-serif text-[#263f5b] text-[17px] leading-5 tracking-[-0.015em] dark:text-foreground">
						{theme.name}
					</h3>

					<p className="mt-2 text-[#6b7e95] text-[12px] leading-[1.5] dark:text-muted-foreground">
						{theme.description}
					</p>
				</div>
			</div>

			<div className="mt-auto flex items-end justify-between gap-3 pt-5">
				<div className="flex min-w-0 flex-wrap gap-1.5">
					{theme.references.map((reference) => (
						<span
							className="truncate rounded bg-[#f1f4f5] px-1.5 py-1 text-[#60748a] text-[8px] dark:bg-muted"
							key={reference}
						>
							{reference}
						</span>
					))}
				</div>

				<span
					aria-hidden="true"
					className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f1f0ec] text-[#536a80] transition-transform group-hover:translate-x-0.5"
				>
					<ArrowRightIcon className="size-3" strokeWidth={1.8} />
				</span>
			</div>
		</article>
	);
}

function ThemesGuide() {
	const items = [
		{
			description:
				"See key passages and how a theme develops throughout Scripture.",
			icon: BookOpenIcon,
			label: "Trace Passages",
		},
		{
			description: "Explore different contexts, genres, and biblical authors.",
			icon: LinkIcon,
			label: "Compare Contexts",
		},
		{
			description: "Understand how a theme unfolds from Genesis to Revelation.",
			icon: BarChart3Icon,
			label: "Study Development",
		},
	] as const;

	return (
		<aside className="rounded-lg border border-[#e5e0d8] bg-white/55 px-6 py-7 shadow-[0_2px_8px_rgba(24,50,79,0.03)] dark:border-border dark:bg-card/70">
			<h2 className="font-serif text-[#294562] text-[18px] tracking-[-0.02em] dark:text-foreground">
				How Themes Work
			</h2>

			<div className="mt-6 space-y-7">
				{items.map((item) => {
					const Icon = item.icon;

					return (
						<div className="flex gap-3" key={item.label}>
							<div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#fbf4e7] text-[#a47736]">
								<Icon
									aria-hidden="true"
									className="size-[18px]"
									strokeWidth={1.8}
								/>
							</div>

							<div>
								<h3 className="font-serif text-[#294562] text-[14px] leading-5 dark:text-foreground">
									{item.label}
								</h3>

								<p className="mt-1.5 text-[#6d8097] text-[11px] leading-[1.55] dark:text-muted-foreground">
									{item.description}
								</p>
							</div>
						</div>
					);
				})}
			</div>

			<blockquote className="mt-8 border-[#e7e2d9] border-t pt-6 font-serif text-[#60748a] text-[13px] italic leading-[1.6] dark:border-border">
				“All Scripture is God-breathed and profitable for teaching, for reproof,
				for correction, and for training in righteousness.”
				<cite className="mt-3 block font-sans text-[#8a98a6] text-[9px] uppercase not-italic tracking-[0.05em]">
					2 Timothy 3:16
				</cite>
			</blockquote>
		</aside>
	);
}

function BrowseCategories({ onViewAll }: { onViewAll: () => void }) {
	return (
		<section className="mt-8 rounded-lg border border-[#e6e2dc] bg-white/60 px-6 py-5 shadow-[0_1px_4px_rgba(24,50,79,0.02)] dark:border-border dark:bg-card/70">
			<div className="flex items-center justify-between gap-4">
				<h2 className="flex items-center gap-2 font-serif text-[#294562] text-[14px] dark:text-foreground">
					<Layers3Icon
						aria-hidden="true"
						className="size-4 text-[#294562]"
						strokeWidth={1.8}
					/>
					Browse by Category
				</h2>

				<button
					className="inline-flex items-center gap-1.5 text-[#54728f] text-[10px] hover:text-[#294562]"
					onClick={onViewAll}
					type="button"
				>
					View all themes
					<ArrowRightIcon className="size-3" />
				</button>
			</div>

			<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
				{categories.map((category) => {
					const Icon = category.icon;

					return (
						<button
							className="group flex min-w-0 items-center gap-3 rounded-md border border-[#eee9e2] bg-white/75 px-4 py-3 text-left transition-colors hover:bg-[#fbf8f2] dark:border-border dark:bg-card"
							key={category.label}
							type="button"
						>
							<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#fbf4e7] text-[#a47736]">
								<Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
							</div>

							<div className="min-w-0">
								<p className="truncate font-medium text-[#405873] text-[9.5px] dark:text-foreground">
									{category.label}
								</p>

								<p className="mt-0.5 text-[#7b8ca0] text-[9px]">
									{category.count}
								</p>
							</div>

							<span className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f2f0eb] text-[#61758b]">
								<ArrowRightIcon
									className="size-3 transition-transform group-hover:translate-x-0.5"
									strokeWidth={1.8}
								/>
							</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}

function ThemeEmptyState({ onReset }: { onReset: () => void }) {
	return (
		<div className="rounded-lg border border-[#dcd8d0] border-dashed bg-white/60 px-5 py-10 text-center dark:border-border dark:bg-card/70">
			<h3 className="font-serif text-[#294562] text-lg dark:text-foreground">
				No themes found
			</h3>

			<p className="mt-1 text-[#71839a] text-sm dark:text-muted-foreground">
				Try another search term or clear the selected filter.
			</p>

			<button
				className="mt-4 rounded-md bg-[#f4ead5] px-3 py-2 font-medium text-[#76582c] text-xs"
				onClick={onReset}
				type="button"
			>
				Show all themes
			</button>
		</div>
	);
}
