import { cn } from "@berean-study/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	BookOpenIcon,
	FeatherIcon,
	FlameIcon,
	Globe2Icon,
	LandmarkIcon,
	LightbulbIcon,
	LinkIcon,
	QuoteIcon,
	SearchIcon,
	StarIcon,
	TypeIcon,
} from "lucide-react";
import { useState } from "react";

type ConnectionFilter =
	| "all"
	| "gospels"
	| "new-testament"
	| "old-testament"
	| "pauline-letters"
	| "prophecy"
	| "themes";

type Accent = "blue" | "gold" | "green" | "plum" | "red";

type Connection = {
	category: Exclude<ConnectionFilter, "all">;
	description: string;
	icon: LucideIcon;
	id: string;
	passages: readonly string[];
	title: string;
};

const filters = [
	{ label: "All", value: "all" },
	{ label: "Old Testament", value: "old-testament" },
	{ label: "New Testament", value: "new-testament" },
	{ label: "Prophecy", value: "prophecy" },
	{ label: "Gospels", value: "gospels" },
	{ label: "Pauline Letters", value: "pauline-letters" },
	{ label: "Themes", value: "themes" },
] as const satisfies readonly { label: string; value: ConnectionFilter }[];

const connectionTypes = [
	{
		accent: "gold",
		description: "See where one passage quotes or alludes to another passage.",
		icon: QuoteIcon,
		id: "quotation",
		passages: ["Matthew 2:6", "Hosea 11:1"],
		title: "Quotation & Allusion",
	},
	{
		accent: "green",
		description:
			"Discover Old Testament promises and their fulfillment in the New Testament.",
		icon: FeatherIcon,
		id: "promise",
		passages: ["Isaiah 53:5", "1 Peter 2:24"],
		title: "Promise & Fulfillment",
	},
	{
		accent: "plum",
		description: "Compare different accounts of the same event or teaching.",
		icon: BookOpenIcon,
		id: "parallel",
		passages: ["Matthew 28:1", "Mark 16:1"],
		title: "Parallel Accounts",
	},
	{
		accent: "blue",
		description: "Explore passages linked by common themes, words, or phrases.",
		icon: LinkIcon,
		id: "theme",
		passages: ["Romans 8:28", "Philippians 4:6"],
		title: "Theme Connections",
	},
	{
		accent: "red",
		description: "Find passages connected by the same key words or phrases.",
		icon: TypeIcon,
		id: "word",
		passages: ["Logos", "Word"],
		title: "Word & Phrase Links",
	},
] as const satisfies readonly {
	accent: Accent;
	description: string;
	icon: LucideIcon;
	id: string;
	passages: readonly string[];
	title: string;
}[];

const connections = [
	{
		category: "gospels",
		description: "Psalm 22 foreshadows the suffering and crucifixion of Jesus.",
		icon: BookOpenIcon,
		id: "psalm-22-matthew-27",
		passages: ["Psalm 22", "Matthew 27"],
		title: "Psalm 22 ↔ Matthew 27",
	},
	{
		category: "prophecy",
		description:
			"Isaiah's prophecy is fulfilled in Christ's suffering and our redemption.",
		icon: FeatherIcon,
		id: "isaiah-53-first-peter-2",
		passages: ["Isaiah 53", "1 Peter 2"],
		title: "Isaiah 53 ↔ 1 Peter 2",
	},
	{
		category: "old-testament",
		description: "The Passover points to Jesus, the ultimate Lamb of God.",
		icon: LandmarkIcon,
		id: "exodus-12-john-19",
		passages: ["Exodus 12", "John 19"],
		title: "Exodus 12 ↔ John 19",
	},
	{
		category: "new-testament",
		description:
			"The outpouring of the Spirit in Joel finds fulfillment at Pentecost.",
		icon: FlameIcon,
		id: "joel-2-acts-2",
		passages: ["Joel 2", "Acts 2"],
		title: "Joel 2 ↔ Acts 2",
	},
	{
		category: "pauline-letters",
		description:
			"The righteous shall live by faith is echoed in Paul's teaching.",
		icon: BookOpenIcon,
		id: "habakkuk-2-romans-1",
		passages: ["Habakkuk 2:4", "Romans 1:17"],
		title: "Habakkuk 2:4 ↔ Romans 1:17",
	},
	{
		category: "themes",
		description:
			"The promise to bless all nations is fulfilled through faith in Christ.",
		icon: Globe2Icon,
		id: "genesis-12-galatians-3",
		passages: ["Genesis 12:3", "Galatians 3:8"],
		title: "Genesis 12:3 ↔ Galatians 3:8",
	},
] as const satisfies readonly Connection[];

const accentClasses: Record<Accent, string> = {
	blue: "bg-[#2389b9]",
	gold: "bg-[#c18b37]",
	green: "bg-[#39966c]",
	plum: "bg-[#8051b5]",
	red: "bg-[#b94b40]",
};

export function CrossReferencesPage() {
	const [filter, setFilter] = useState<ConnectionFilter>("all");
	const [query, setQuery] = useState("");

	const normalizedQuery = query.trim().toLowerCase();
	const visibleConnections = connections.filter((connection) => {
		const matchesFilter = filter === "all" || connection.category === filter;
		const searchableText = [
			connection.title,
			connection.description,
			...connection.passages,
		]
			.join(" ")
			.toLowerCase();

		return matchesFilter && searchableText.includes(normalizedQuery);
	});

	function resetFilters() {
		setFilter("all");
		setQuery("");
	}

	return (
		<main className="min-h-full bg-[#fbfaf7] dark:bg-background">
			<div className="mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-10 lg:py-10">
				<div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
					<div className="min-w-0">
						<CrossReferencesHeader
							filter={filter}
							onFilterChange={setFilter}
							onQueryChange={setQuery}
							query={query}
						/>
						<FeaturedConnection />
						<ConnectionTypes />
						<SuggestedConnections
							connections={visibleConnections}
							onReset={resetFilters}
						/>
					</div>

					<CrossReferencesGuide />
				</div>
			</div>
		</main>
	);
}

function CrossReferencesHeader({
	filter,
	onFilterChange,
	onQueryChange,
	query,
}: {
	filter: ConnectionFilter;
	onFilterChange: (filter: ConnectionFilter) => void;
	onQueryChange: (query: string) => void;
	query: string;
}) {
	return (
		<header>
			<p className="font-semibold text-[#36577a] text-[10px] uppercase tracking-[0.06em] dark:text-primary">
				Study Tools
			</p>
			<h1 className="mt-2 font-serif text-[#17365e] text-[42px] leading-none tracking-[-0.035em] dark:text-foreground">
				Cross References
			</h1>
			<p className="mt-4 max-w-[760px] text-[#405f80] text-[15px] leading-[1.6] dark:text-muted-foreground">
				Discover how passages connect across Scripture. Explore related
				passages, compare contexts, and trace biblical connections to gain a
				deeper, more unified understanding of God&apos;s Word.
			</p>

			<div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
				<label
					className="relative min-w-0 flex-1"
					htmlFor="cross-reference-search"
				>
					<span className="sr-only">Search references</span>
					<SearchIcon
						aria-hidden="true"
						className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#507294]"
						strokeWidth={1.8}
					/>
					<input
						className="h-10 w-full rounded-lg border border-[#e6e2db] bg-white py-2 pr-3 pl-10 text-[#355675] text-[12px] shadow-[0_1px_3px_rgba(24,50,79,0.05)] outline-none placeholder:text-[#8293a6] focus:border-[#c79c58] focus:ring-2 focus:ring-[#d8c79e]/25 dark:border-border dark:bg-card dark:text-foreground"
						id="cross-reference-search"
						onChange={(event) => onQueryChange(event.target.value)}
						placeholder="Search passages, themes, or references..."
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
									? "border-[#eadcc1] bg-[#f8eedb] font-medium text-[#76572b]"
									: "border-[#e6e4e0] bg-white text-[#5f7690] hover:bg-[#faf8f4]",
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

function FeaturedConnection() {
	return (
		<section className="relative mt-8 min-h-[310px] overflow-hidden rounded-lg border border-[#e4dfd5] bg-[#f8f4ec] shadow-[0_2px_7px_rgba(24,50,79,0.05)] sm:min-h-[340px]">
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[position:65%_center] bg-[url('/landing/cta-hills.png')] bg-cover bg-no-repeat"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[linear-gradient(90deg,#fcfbf7_0%,#fcfbf7_29%,rgba(252,251,247,0.97)_42%,rgba(252,251,247,0.69)_58%,rgba(252,251,247,0.12)_83%,transparent_100%)] dark:bg-[linear-gradient(90deg,var(--card)_0%,var(--card)_44%,rgba(0,0,0,0.2)_73%,transparent_100%)]"
			/>
			<div className="relative z-10 max-w-[600px] px-7 py-7 sm:px-10 sm:py-9">
				<p className="flex items-center gap-1.5 font-semibold text-[#a4742f] text-[10px] uppercase tracking-[0.04em]">
					<StarIcon aria-hidden="true" className="size-3 fill-current" />
					Featured Connection
				</p>
				<h2 className="mt-2 font-serif text-[#17365e] text-[38px] leading-none tracking-[-0.03em] dark:text-foreground">
					John 1:1 ↔ Genesis 1:1
				</h2>
				<p className="mt-3 max-w-[540px] text-[#58708a] text-[13px] leading-[1.6] dark:text-muted-foreground">
					John opens his Gospel with language that echoes Genesis, presenting
					Jesus in the context of creation and the beginning. Both passages
					reveal the eternal nature of God and the role of the Word in creation,
					showing the continuity between the Old and New Testaments.
				</p>
				<div className="mt-5 flex flex-wrap gap-2">
					{["John 1:1", "Genesis 1:1"].map((passage) => (
						<span
							className="rounded-md border border-[#dce2e4] bg-white/72 px-2.5 py-1.5 text-[#496b89] text-[10px] shadow-sm backdrop-blur-sm"
							key={passage}
						>
							{passage}
						</span>
					))}
				</div>
				<div className="mt-5 flex flex-wrap gap-3">
					<button
						className="inline-flex h-10 items-center gap-2 rounded-md bg-[#b78332] px-5 font-medium text-[12px] text-white shadow-sm transition-colors hover:bg-[#a57429]"
						type="button"
					>
						Compare passages
						<ArrowRightIcon aria-hidden="true" className="size-3.5" />
					</button>
					<button
						className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e3e2dd] bg-white/75 px-5 font-medium text-[#496b89] text-[12px] shadow-sm transition-colors hover:bg-white"
						type="button"
					>
						<BookOpenIcon aria-hidden="true" className="size-3.5" />
						See full context
					</button>
				</div>
			</div>
		</section>
	);
}

function ConnectionTypes() {
	return (
		<section aria-labelledby="connection-types-heading" className="mt-8">
			<div className="flex items-start gap-4">
				<BookOpenIcon
					aria-hidden="true"
					className="mt-0.5 size-7 shrink-0 text-[#173d67]"
					strokeWidth={1.7}
				/>
				<div>
					<h2
						className="font-serif text-[#17365e] text-[21px] leading-6 dark:text-foreground"
						id="connection-types-heading"
					>
						Explore by Connection Type
					</h2>
					<p className="mt-1 text-[#68809b] text-[11px] leading-[1.5] dark:text-muted-foreground">
						Browse cross references by the type of biblical connection to see
						how Scripture relates across different ways.
					</p>
				</div>
			</div>

			<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{connectionTypes.map((connectionType) => (
					<ConnectionTypeCard
						connectionType={connectionType}
						key={connectionType.id}
					/>
				))}
			</div>
		</section>
	);
}

function ConnectionTypeCard({
	connectionType,
}: {
	connectionType: (typeof connectionTypes)[number];
}) {
	const Icon = connectionType.icon;

	return (
		<article className="flex min-h-[218px] flex-col rounded-lg border border-[#ebe8e2] bg-white p-5 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card">
			<div className="flex gap-4">
				<div
					className={cn(
						"flex size-10 shrink-0 items-center justify-center rounded-md text-white shadow-sm",
						accentClasses[connectionType.accent],
					)}
				>
					<Icon aria-hidden="true" className="size-4" strokeWidth={2} />
				</div>
				<div>
					<h3 className="font-serif text-[#284767] text-[15px] leading-5 dark:text-foreground">
						{connectionType.title}
					</h3>
					<p className="mt-2 text-[#71849a] text-[11px] leading-[1.5] dark:text-muted-foreground">
						{connectionType.description}
					</p>
				</div>
			</div>
			<div className="mt-auto flex items-center justify-between gap-3 pt-5">
				<div className="flex min-w-0 flex-wrap gap-1.5">
					{connectionType.passages.map((passage) => (
						<span
							className="truncate rounded bg-[#f0f3f5] px-2 py-1 text-[#607891] text-[9px]"
							key={passage}
						>
							{passage}
						</span>
					))}
				</div>
				<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f4f2ed] text-[#60748a]">
					<ArrowRightIcon aria-hidden="true" className="size-3" />
				</span>
			</div>
		</article>
	);
}

function SuggestedConnections({
	connections,
	onReset,
}: {
	connections: readonly Connection[];
	onReset: () => void;
}) {
	return (
		<section aria-labelledby="suggested-references-heading" className="mt-8">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-start gap-4">
					<LinkIcon
						aria-hidden="true"
						className="mt-0.5 size-6 shrink-0 text-[#173d67]"
						strokeWidth={1.9}
					/>
					<div>
						<h2
							className="font-serif text-[#17365e] text-[21px] leading-6 dark:text-foreground"
							id="suggested-references-heading"
						>
							Suggested Cross References
						</h2>
						<p className="mt-1 text-[#68809b] text-[11px] leading-[1.5] dark:text-muted-foreground">
							Explore some key cross-reference connections to see how passages
							relate across Scripture.
						</p>
					</div>
				</div>
				<button
					className="hidden h-9 shrink-0 items-center gap-2 rounded-md border border-[#e3e4e1] bg-white px-4 text-[#426588] text-[11px] shadow-sm hover:bg-[#faf9f5] sm:inline-flex"
					onClick={onReset}
					type="button"
				>
					View all references
					<ArrowRightIcon aria-hidden="true" className="size-3" />
				</button>
			</div>

			{connections.length > 0 ? (
				<div className="mt-5 grid gap-4 md:grid-cols-2">
					{connections.map((connection) => (
						<SuggestedConnectionCard
							connection={connection}
							key={connection.id}
						/>
					))}
				</div>
			) : (
				<div className="mt-3 rounded-lg border border-[#dbd8d1] border-dashed bg-white/65 px-5 py-9 text-center dark:border-border dark:bg-card/70">
					<h3 className="font-serif text-[#294562] text-lg dark:text-foreground">
						No references found
					</h3>
					<p className="mt-1 text-[#71839a] text-sm dark:text-muted-foreground">
						Try a different search or clear the selected filter.
					</p>
					<button
						className="mt-4 rounded-md bg-[#f5ead7] px-3 py-2 font-medium text-[#76582c] text-xs"
						onClick={onReset}
						type="button"
					>
						Show all references
					</button>
				</div>
			)}
		</section>
	);
}

function SuggestedConnectionCard({ connection }: { connection: Connection }) {
	const Icon = connection.icon;

	return (
		<article className="flex min-h-[108px] items-center gap-4 rounded-lg border border-[#ebe8e2] bg-white p-4 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card">
			<div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#fbf4e7] text-[#a97732]">
				<Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
			</div>
			<div className="min-w-0 flex-1">
				<h3 className="font-serif text-[#294967] text-[15px] leading-5 dark:text-foreground">
					{connection.title}
				</h3>
				<p className="mt-1 line-clamp-2 text-[#71849a] text-[11px] leading-[1.45] dark:text-muted-foreground">
					{connection.description}
				</p>
			</div>
			<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f3f1ec] text-[#60748a]">
				<ArrowRightIcon aria-hidden="true" className="size-3" />
			</span>
		</article>
	);
}

function CrossReferencesGuide() {
	const helpItems = [
		{
			description: "Discover how passages fit together across Scripture.",
			icon: BookOpenIcon,
			title: "See the Bigger Picture",
		},
		{
			description:
				"Understand how the same themes, events, or phrases appear in different books.",
			icon: LinkIcon,
			title: "Compare Contexts",
		},
		{
			description:
				"Follow the unfolding story of redemption from Genesis to Revelation.",
			icon: LandmarkIcon,
			title: "Trace God’s Plan",
		},
		{
			description: "Gain a richer, more unified understanding of God’s Word.",
			icon: LightbulbIcon,
			title: "Study More Deeply",
		},
	] as const;
	const suggestions = [
		"Start with a passage you want to understand more deeply.",
		"Explore related passages and compare their contexts.",
		"Look for recurring themes, words, or phrases.",
		"Consider how the passages fit into God’s bigger story.",
		"Use cross references to support personal study, teaching, or biblical projects.",
	] as const;

	return (
		<aside className="space-y-5">
			<section className="rounded-lg border border-[#e8e3da] bg-white/60 px-6 py-6 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70">
				<h2 className="font-serif text-[#294562] text-[19px] dark:text-foreground">
					How Cross References Help
				</h2>
				<div className="mt-5 space-y-5">
					{helpItems.map((item) => {
						const Icon = item.icon;

						return (
							<div className="flex gap-3" key={item.title}>
								<div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#fcf5e9] text-[#ad7830]">
									<Icon
										aria-hidden="true"
										className="size-5"
										strokeWidth={1.8}
									/>
								</div>
								<div>
									<h3 className="font-serif text-[#294562] text-[14px] leading-5 dark:text-foreground">
										{item.title}
									</h3>
									<p className="mt-1 text-[#71849a] text-[11px] leading-[1.5] dark:text-muted-foreground">
										{item.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			<blockquote className="rounded-lg border border-[#e8e3da] bg-white/60 px-6 py-6 font-serif text-[#5e7189] text-[14px] italic leading-[1.55] shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70 dark:text-muted-foreground">
				“All Scripture is God-breathed and profitable for teaching, for reproof,
				for correction, and for training in righteousness, that the man of God
				may be complete, equipped for every good work.”
				<cite className="mt-3 block font-sans text-[#75879a] text-[9px] not-italic">
					2 Timothy 3:16–17
				</cite>
			</blockquote>

			<section className="rounded-lg border border-[#e8e3da] bg-white/60 px-6 py-6 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70">
				<h2 className="flex items-center gap-2 font-serif text-[#294562] text-[19px] dark:text-foreground">
					<LightbulbIcon aria-hidden="true" className="size-5 text-[#ad7830]" />
					Study Suggestions
				</h2>
				<ol className="mt-5 space-y-5">
					{suggestions.map((suggestion, index) => (
						<li className="flex gap-3" key={suggestion}>
							<span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#eee4d4] bg-[#fcf8ef] font-medium text-[#8b7554] text-[11px]">
								{index + 1}
							</span>
							<p className="pt-0.5 text-[#6b8098] text-[11px] leading-[1.5] dark:text-muted-foreground">
								{suggestion}
							</p>
						</li>
					))}
				</ol>
			</section>
		</aside>
	);
}
