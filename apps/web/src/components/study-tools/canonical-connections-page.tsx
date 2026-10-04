import { cn } from "@berean-study/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	BookmarkIcon,
	BookOpenIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	CrossIcon,
	CrownIcon,
	ExternalLinkIcon,
	FilterIcon,
	FlameIcon,
	HeartIcon,
	LandmarkIcon,
	LightbulbIcon,
	LinkIcon,
	MoreVerticalIcon,
	SearchIcon,
	Share2Icon,
	SproutIcon,
	UsersRoundIcon,
} from "lucide-react";
import { useState } from "react";

type ConnectionCategory =
	| "event"
	| "new-testament"
	| "old-testament"
	| "other"
	| "person"
	| "promise"
	| "theme";
type DetailTab =
	| "overview"
	| "key-passages"
	| "development"
	| "theological-significance"
	| "related-connections";
type ConnectionTone = "gold" | "green" | "plum" | "red" | "rose" | "violet";
type CanonicalConnection = {
	category: ConnectionCategory;
	description: string;
	icon: LucideIcon;
	id: string;
	references: string;
	title: string;
	tone: ConnectionTone;
};

const filters = [
	{ label: "All", value: "all" },
	{ label: "Old Testament", value: "old-testament" },
	{ label: "New Testament", value: "new-testament" },
	{ label: "Theme", value: "theme" },
	{ label: "Person", value: "person" },
	{ label: "Event", value: "event" },
	{ label: "Promise and fulfillment", value: "promise" },
	{ label: "Other", value: "other" },
] as const;
type ConnectionFilter = (typeof filters)[number]["value"];

const connections: readonly CanonicalConnection[] = [
	{
		category: "theme",
		description:
			"How the theme of God's kingdom develops from the Old Testament to the New Testament.",
		icon: CrownIcon,
		id: "kingdom-of-god",
		references: "Psalm 2 · Isaiah 9 · Daniel 7 · Matthew 4 · Revelation 11",
		title: "The Kingdom of God",
		tone: "gold",
	},
	{
		category: "promise",
		description:
			"Connections between God's promise of a new covenant and its fulfillment in Christ.",
		icon: CrossIcon,
		id: "new-covenant",
		references: "Jeremiah 31 · Ezekiel 36 · Luke 22 · Hebrews 8",
		title: "The New Covenant",
		tone: "red",
	},
	{
		category: "promise",
		description:
			"Traces the promise of a deliverer from Genesis to its fulfillment in Jesus.",
		icon: SproutIcon,
		id: "seed-of-the-woman",
		references: "Genesis 3 · Genesis 12 · Isaiah 9 · Galatians 3",
		title: "The Seed of the Woman",
		tone: "green",
	},
	{
		category: "theme",
		description: "From Eden to the tabernacle, temple, and the new creation.",
		icon: LandmarkIcon,
		id: "gods-dwelling",
		references: "Genesis 3 · Exodus 25 · 2 Chronicles 6 · Revelation 21",
		title: "God's Dwelling with His People",
		tone: "violet",
	},
	{
		category: "event",
		description: "From Old Testament prophecy to Pentecost and beyond.",
		icon: FlameIcon,
		id: "outpouring-of-spirit",
		references: "Joel 2 · Ezekiel 36 · Acts 2 · Romans 8",
		title: "The Outpouring of the Spirit",
		tone: "rose",
	},
	{
		category: "theme",
		description:
			"How God's plan to bless all nations unfolds throughout Scripture.",
		icon: HeartIcon,
		id: "people-for-all-nations",
		references: "Genesis 12 · Isaiah 49 · Matthew 28 · Revelation 7",
		title: "A People for All Nations",
		tone: "red",
	},
];

const detailTabs = [
	{ id: "overview", label: "Overview" },
	{ id: "key-passages", label: "Key Passages" },
	{ id: "development", label: "Development" },
	{ id: "theological-significance", label: "Theological Significance" },
	{ id: "related-connections", label: "Related Connections" },
] as const satisfies readonly { id: DetailTab; label: string }[];
const toneClasses: Record<ConnectionTone, string> = {
	gold: "bg-[#fff1ca] text-[#c58b13]",
	green: "bg-[#e3f4e4] text-[#339457]",
	plum: "bg-[#efe8fb] text-[#7f5ab4]",
	red: "bg-[#fce4e5] text-[#b94754]",
	rose: "bg-[#fff0e5] text-[#cc6529]",
	violet: "bg-[#eee8ff] text-[#7157b2]",
};

export function CanonicalConnectionsPage() {
	const [activeFilter, setActiveFilter] = useState<ConnectionFilter>("all");
	const [activeTab, setActiveTab] = useState<DetailTab>("overview");
	const [isSaved, setIsSaved] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
		connections[0].id,
	);
	const normalizedQuery = query.trim().toLowerCase();
	const visibleConnections = connections.filter(
		(connection) =>
			(activeFilter === "all" || connection.category === activeFilter) &&
			[connection.title, connection.description, connection.references]
				.join(" ")
				.toLowerCase()
				.includes(normalizedQuery),
	);
	const selectedConnection =
		connections.find((connection) => connection.id === selectedConnectionId) ??
		connections[0];
	return (
		<main className="min-h-full bg-[#fbfaf7] dark:bg-background">
			<CanonicalConnectionsHero />
			<div className="relative z-10 mx-auto -mt-12 w-full max-w-[1500px] px-5 pb-8 lg:px-7 2xl:px-8">
				<div className="grid items-start gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
					<ConnectionCatalogue
						activeFilter={activeFilter}
						onFilterChange={setActiveFilter}
						onQueryChange={setQuery}
						onSelect={(connectionId) => {
							setSelectedConnectionId(connectionId);
							setActiveTab("overview");
						}}
						query={query}
						selectedConnectionId={selectedConnection.id}
						visibleConnections={visibleConnections}
					/>
					<ConnectionDetail
						activeTab={activeTab}
						connection={selectedConnection}
						isSaved={isSaved}
						onSaveToggle={() => setIsSaved((saved) => !saved)}
						onTabChange={setActiveTab}
					/>
				</div>
			</div>
		</main>
	);
}

function CanonicalConnectionsHero() {
	return (
		<header className="relative isolate h-[182px] overflow-hidden border-[#e7e2d8] border-b bg-[#f8f4ec] dark:border-border dark:bg-card">
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[position:center_right] bg-[url('/canonical-connections-hero.png')] bg-cover bg-no-repeat"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[linear-gradient(90deg,#fbfaf7_0%,#fbfaf7_28%,rgba(251,250,247,0.96)_41%,rgba(251,250,247,0.44)_64%,rgba(251,250,247,0.04)_92%)] dark:bg-[linear-gradient(90deg,var(--card)_0%,var(--card)_44%,rgba(0,0,0,0.2)_76%,transparent_100%)]"
			/>
			<div className="relative z-10 mx-auto w-full max-w-[1500px] px-5 pt-5 lg:px-7 2xl:px-8">
				<p className="flex items-center gap-1.5 font-semibold text-[#36577a] text-[11px] uppercase tracking-[0.07em] dark:text-primary">
					<ArrowLeftIcon className="size-3.5" strokeWidth={1.8} />
					Study Tools
				</p>
				<h1 className="mt-2 font-serif text-[#17365e] text-[40px] leading-none tracking-[-0.04em] dark:text-foreground">
					Canonical Connections
				</h1>
				<p className="mt-2.5 max-w-[700px] text-[#476581] text-[14px] leading-[1.5] dark:text-muted-foreground">
					See how passages, books, and themes connect across the whole Bible,
					from Genesis to Revelation.
				</p>
			</div>
		</header>
	);
}

function ConnectionCatalogue({
	activeFilter,
	onFilterChange,
	onQueryChange,
	onSelect,
	query,
	selectedConnectionId,
	visibleConnections,
}: {
	activeFilter: ConnectionFilter;
	onFilterChange: (filter: ConnectionFilter) => void;
	onQueryChange: (query: string) => void;
	onSelect: (connectionId: string) => void;
	query: string;
	selectedConnectionId: string;
	visibleConnections: readonly CanonicalConnection[];
}) {
	const resultLabel =
		activeFilter === "all" && query.trim().length === 0
			? "42 canonical connections"
			: `${visibleConnections.length} ${visibleConnections.length === 1 ? "connection" : "connections"}`;
	return (
		<section
			aria-label="Canonical connection catalogue"
			className="overflow-hidden rounded-[10px] border border-[#e5e3df] bg-white shadow-[0_4px_16px_rgba(24,50,79,0.055)] dark:border-border dark:bg-card dark:shadow-none"
		>
			<div className="border-[#ece9e3] border-b p-3.5 dark:border-border">
				<div className="flex gap-2">
					<label
						className="relative min-w-0 flex-1"
						htmlFor="canonical-connections-search"
					>
						<span className="sr-only">Search canonical connections</span>
						<SearchIcon
							aria-hidden="true"
							className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#527491]"
							strokeWidth={1.8}
						/>
						<input
							className="h-9 w-full rounded-md border border-[#e2e5e7] bg-white py-2 pr-3 pl-9 text-[#365775] text-[11px] outline-none placeholder:text-[#8494a5] focus:border-[#7c9ab8] focus:ring-2 focus:ring-[#9db6cf]/20 dark:border-border dark:bg-card dark:text-foreground"
							id="canonical-connections-search"
							onChange={(event) => onQueryChange(event.target.value)}
							placeholder="Search canonical connections..."
							type="search"
							value={query}
						/>
					</label>
					<button
						aria-label="Filter canonical connections"
						className="grid size-9 place-items-center rounded-md border border-[#e2e5e7] text-[#496a89] hover:bg-[#f6f9fc] dark:border-border"
						type="button"
					>
						<FilterIcon className="size-4" strokeWidth={1.8} />
					</button>
				</div>
				<div className="mt-2.5 flex flex-wrap gap-1.5">
					{filters.map((filter) => (
						<button
							aria-pressed={activeFilter === filter.value}
							className={cn(
								"h-7 rounded-full border px-3 text-[10px] transition-colors",
								activeFilter === filter.value
									? "border-[#b9d3ed] bg-[#e9f3fd] font-medium text-[#306891]"
									: "border-[#e6e8e9] bg-[#f7f8f9] text-[#5b718b] hover:bg-[#f0f5fa] dark:border-border dark:bg-muted",
							)}
							key={filter.value}
							onClick={() => onFilterChange(filter.value)}
							type="button"
						>
							{filter.label}
						</button>
					))}
				</div>
			</div>
			<div className="flex items-center justify-between px-3.5 py-2.5">
				<p className="font-semibold text-[#385977] text-[11px] dark:text-foreground">
					{resultLabel}
				</p>
				<button
					className="inline-flex h-8 items-center gap-5 rounded-md border border-[#e4e6e7] px-3 text-[#4e6680] text-[10px] hover:bg-[#fafafa] dark:border-border"
					type="button"
				>
					Most relevant
					<ChevronDownIcon className="size-3.5" />
				</button>
			</div>
			{visibleConnections.length > 0 ? (
				<ul className="divide-y divide-[#edf0f1] dark:divide-border">
					{visibleConnections.map((connection) => (
						<ConnectionRow
							connection={connection}
							key={connection.id}
							onSelect={onSelect}
							selected={selectedConnectionId === connection.id}
						/>
					))}
				</ul>
			) : (
				<div className="px-5 py-12 text-center">
					<h2 className="font-serif text-[#294562] text-lg dark:text-foreground">
						No canonical connections found
					</h2>
					<p className="mt-1 text-[#71849a] text-xs">
						Try another category or search term.
					</p>
				</div>
			)}
		</section>
	);
}

function ConnectionRow({
	connection,
	onSelect,
	selected,
}: {
	connection: CanonicalConnection;
	onSelect: (id: string) => void;
	selected: boolean;
}) {
	const Icon = connection.icon;
	return (
		<li>
			<button
				aria-current={selected ? "true" : undefined}
				className={cn(
					"group flex w-full items-start gap-3 border-l-[3px] px-3.5 py-2.5 text-left transition-colors",
					selected
						? "border-[#c5dff5] bg-[linear-gradient(90deg,#edf6fe_0%,#f9fcff_100%)]"
						: "border-transparent hover:bg-[#f8fafb] dark:hover:bg-muted/50",
				)}
				onClick={() => onSelect(connection.id)}
				type="button"
			>
				<span
					className={cn(
						"grid size-9 shrink-0 place-items-center rounded-full",
						toneClasses[connection.tone],
					)}
				>
					<Icon className="size-[18px]" strokeWidth={2} />
				</span>
				<span className="min-w-0 flex-1">
					<h2 className="font-medium text-[#284b6d] text-[11.5px] leading-[1.35] dark:text-foreground">
						{connection.title}
					</h2>
					<span className="mt-1 block text-[#58718d] text-[10px] leading-[1.4]">
						{connection.description}
					</span>
					<span className="mt-1 block text-[#7a8ba0] text-[9px]">
						{connection.references}
					</span>
				</span>
				<ChevronRightIcon
					className="mt-5 size-4 shrink-0 text-[#365a79]"
					strokeWidth={1.7}
				/>
			</button>
		</li>
	);
}

function ConnectionDetail({
	activeTab,
	connection,
	isSaved,
	onSaveToggle,
	onTabChange,
}: {
	activeTab: DetailTab;
	connection: CanonicalConnection;
	isSaved: boolean;
	onSaveToggle: () => void;
	onTabChange: (tab: DetailTab) => void;
}) {
	const Icon = connection.icon;
	const description =
		connection.id === "kingdom-of-god"
			? "The theme of God's kingdom runs throughout Scripture, showing how God reigns now, through His people and in Christ, and will fully establish His kingdom in the future."
			: connection.description;
	return (
		<article className="overflow-hidden rounded-[10px] border border-[#e5e3df] bg-white shadow-[0_4px_16px_rgba(24,50,79,0.055)] dark:border-border dark:bg-card dark:shadow-none">
			<header className="px-5 pt-4 sm:px-6">
				<div className="flex items-start justify-between gap-6">
					<div className="min-w-0">
						<p className="flex items-center gap-2 font-semibold text-[#496786] text-[10px] uppercase tracking-[0.06em]">
							<span
								className={cn(
									"grid size-7 place-items-center rounded-full",
									toneClasses[connection.tone],
								)}
							>
								<Icon className="size-3.5" />
							</span>
							Canonical connection
						</p>
						<h2 className="mt-2 font-serif text-[#17365e] text-[27px] leading-[1.15] tracking-[-0.025em] lg:text-[30px] dark:text-foreground">
							{connection.title}
						</h2>
						<p className="mt-2 max-w-[900px] text-[#58718d] text-[12px] leading-[1.55] dark:text-muted-foreground">
							{description}
						</p>
					</div>
					<div className="flex shrink-0 gap-2">
						<button
							aria-label={
								isSaved
									? "Remove canonical connection from saved"
									: "Save connection"
							}
							aria-pressed={isSaved}
							className={cn(
								"hidden h-9 items-center gap-2 rounded-md border px-3 text-[#355b7c] text-[10px] hover:bg-[#f7fafc] sm:inline-flex dark:border-border",
								isSaved ? "border-[#bfd7ed] bg-[#eef7ff]" : "border-[#e2e6e8]",
							)}
							onClick={onSaveToggle}
							type="button"
						>
							<BookmarkIcon
								className={cn("size-3.5", isSaved && "fill-current")}
							/>
							Save
						</button>
						<button
							className="hidden h-9 items-center gap-2 rounded-md border border-[#e2e6e8] px-3 text-[#355b7c] text-[10px] hover:bg-[#f7fafc] sm:inline-flex dark:border-border"
							type="button"
						>
							<Share2Icon className="size-3.5" />
							Share
						</button>
						<button
							aria-label="More connection actions"
							className="grid size-9 place-items-center rounded-md border border-[#e2e6e8] text-[#355b7c] hover:bg-[#f7fafc] dark:border-border"
							type="button"
						>
							<MoreVerticalIcon className="size-4" />
						</button>
					</div>
				</div>
			</header>
			<div
				aria-label="Canonical connection detail sections"
				className="mt-4 flex overflow-x-auto border-[#e9edef] border-y px-2 sm:px-3 dark:border-border"
				role="tablist"
			>
				{detailTabs.map((tab) => (
					<button
						aria-selected={activeTab === tab.id}
						className={cn(
							"relative shrink-0 px-4 py-3 text-[10px]",
							activeTab === tab.id
								? "font-semibold text-[#264d72] dark:text-foreground"
								: "text-[#56708b] hover:text-[#264d72] dark:text-muted-foreground",
						)}
						key={tab.id}
						onClick={() => onTabChange(tab.id)}
						role="tab"
						type="button"
					>
						{tab.label}
						{activeTab === tab.id && (
							<span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#174b79]" />
						)}
					</button>
				))}
			</div>
			<div className="p-4 sm:p-5">
				{activeTab === "overview" ? (
					<Overview />
				) : (
					<DetailSection tab={activeTab} />
				)}
			</div>
		</article>
	);
}

function Overview() {
	return (
		<div>
			<section className="rounded-[9px] border border-[#f1e8d8] bg-[linear-gradient(110deg,#fdf9f0_0%,#fffcf7_100%)] px-5 py-4 dark:border-border dark:bg-muted/30">
				<h3 className="flex items-center gap-2 font-serif text-[#294b6c] text-[16px] dark:text-foreground">
					<LandmarkIcon className="size-4.5 text-[#8a6430]" />
					Summary
				</h3>
				<div className="mt-2 space-y-2 pl-6 text-[#52708d] text-[11px] leading-[1.55] dark:text-muted-foreground">
					<p>
						The kingdom of God refers to God’s rule and reign over all creation.
						In the Old Testament, it is seen in God’s sovereignty, His covenant
						with Israel, and the hope for a future king who would establish
						everlasting rule.
					</p>
					<p>
						In the New Testament, Jesus inaugurates the kingdom through His
						life, death, and resurrection. The kingdom is present now in His
						people, growing in the world, and will be fully realized when Christ
						returns.
					</p>
				</div>
			</section>
			<div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1.08fr]">
				<KeyPassages />
				<MainThemes />
				<AtAGlance />
			</div>
			<CanonicalFlow />
		</div>
	);
}

function KeyPassages() {
	const passages = [
		["Psalm 2:1–12", "God's anointed king"],
		["Isaiah 9:6–7", "A coming righteous king"],
		["Daniel 7:13–14", "Everlasting dominion"],
		["Matthew 4:17", "The kingdom has come near"],
		["Revelation 11:15", "The kingdom of the world..."],
	] as const;
	return (
		<section className="min-h-[210px] rounded-[9px] border border-[#e5e7e8] p-4 dark:border-border">
			<h3 className="flex items-center gap-2 font-serif text-[#294b6c] text-[14px] dark:text-foreground">
				<BookOpenIcon className="size-4 text-[#285f8d]" />
				Key Passages
			</h3>
			<ul className="mt-3 space-y-2.5">
				{passages.map(([reference, detail]) => (
					<li className="flex gap-2" key={reference}>
						<BookOpenIcon className="mt-0.5 size-3 text-[#2f638d]" />
						<span className="min-w-0 flex-1">
							<span className="block font-medium text-[#355b7d] text-[9px]">
								{reference}
							</span>
							<span className="block text-[#71849a] text-[8.5px]">
								{detail}
							</span>
						</span>
						<ExternalLinkIcon className="mt-0.5 size-3 text-[#5f7893]" />
					</li>
				))}
			</ul>
		</section>
	);
}

function MainThemes() {
	const themes = [
		["God's rule and sovereignty", "bg-[#fff0d2] text-[#906d2f]"],
		["Messianic hope", "bg-[#e2effd] text-[#3c739f]"],
		["Fulfillment in Christ", "bg-[#e4f1e7] text-[#477455]"],
		["Present and future kingdom", "bg-[#f9e0e0] text-[#9d5554]"],
		["Discipleship and obedience", "bg-[#ece6f8] text-[#6a568c]"],
		["Righteousness and justice", "bg-[#ddf1f6] text-[#397c8d]"],
		["Eternal reign", "bg-[#ede8fe] text-[#70598c]"],
	] as const;
	return (
		<section className="min-h-[210px] rounded-[9px] border border-[#e5e7e8] p-4 dark:border-border">
			<h3 className="flex items-center gap-2 font-serif text-[#294b6c] text-[14px] dark:text-foreground">
				<LinkIcon className="size-4 text-[#285f8d]" />
				Main Themes
			</h3>
			<div className="mt-3 flex flex-wrap gap-1.5">
				{themes.map(([theme, styles]) => (
					<span
						className={cn("rounded-full px-2.5 py-1 text-[9px]", styles)}
						key={theme}
					>
						{theme}
					</span>
				))}
			</div>
		</section>
	);
}

function AtAGlance() {
	const points = [
		"The kingdom of God is present now, but not yet fully realized.",
		"It is inaugurated through Jesus and will be completed at His return.",
		"It includes both spiritual and future, visible aspects.",
		"It affects how we live now, as citizens of His kingdom.",
		"It connects God’s redemptive plan from Genesis to Revelation.",
	] as const;
	return (
		<section className="min-h-[210px] rounded-[9px] border border-[#e5e7e8] p-4 dark:border-border">
			<h3 className="flex items-center gap-2 font-serif text-[#294b6c] text-[14px] dark:text-foreground">
				<LightbulbIcon className="size-4 text-[#285f8d]" />
				At a Glance
			</h3>
			<ul className="mt-3 space-y-2">
				{points.map((point) => (
					<li
						className="flex gap-2 text-[#627a93] text-[9px] leading-[1.35] dark:text-muted-foreground"
						key={point}
					>
						<CheckIcon
							className="mt-px size-3.5 shrink-0 text-[#295d87]"
							strokeWidth={2.1}
						/>
						{point}
					</li>
				))}
			</ul>
		</section>
	);
}

function CanonicalFlow() {
	const stages = [
		["Promise", "Genesis 3:15", "Protoevangelium", SproutIcon, "green"],
		["Anticipation", "2 Samuel 7:12–16", "Davidic covenant", CrownIcon, "gold"],
		[
			"Expectation",
			"Daniel 7:13–14",
			"Everlasting dominion",
			BookOpenIcon,
			"plum",
		],
		["Inauguration", "Luke 17:20–21", "The kingdom has come", CrossIcon, "red"],
		["Growth", "Acts 1:3–8", "Through His people", UsersRoundIcon, "violet"],
		[
			"Consummation",
			"Revelation 11:15",
			"Eternal kingdom",
			LightbulbIcon,
			"gold",
		],
	] as const satisfies readonly (readonly [
		string,
		string,
		string,
		LucideIcon,
		ConnectionTone,
	])[];
	return (
		<section className="mt-4 border-[#e8ecee] border-t pt-3.5 dark:border-border">
			<h3 className="flex items-center gap-2 font-serif text-[#294b6c] text-[14px] dark:text-foreground">
				<LinkIcon className="size-4 text-[#285f8d]" />
				Canonical Flow
			</h3>
			<ol className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
				{stages.map(([title, reference, description, Icon, tone], index) => (
					<li
						className="relative rounded-[7px] border border-[#e6e9eb] px-2 py-2 text-center"
						key={title}
					>
						{index < stages.length - 1 && (
							<ArrowRightIcon
								aria-hidden="true"
								className="absolute top-3.5 -right-2.5 z-10 hidden size-3 text-[#a4acb3] xl:block"
							/>
						)}
						<span
							className={cn(
								"mx-auto grid size-7 place-items-center rounded-full",
								toneClasses[tone],
							)}
						>
							<Icon className="size-3.5" />
						</span>
						<p className="mt-1 font-semibold text-[#355876] text-[9px]">
							{title}
						</p>
						<p className="mt-1 text-[#5d7690] text-[8px]">{reference}</p>
						<p className="text-[#8491a0] text-[7.5px]">{description}</p>
					</li>
				))}
			</ol>
		</section>
	);
}

function DetailSection({ tab }: { tab: Exclude<DetailTab, "overview"> }) {
	const content = {
		"key-passages": [
			"Key Passages",
			"Read the principal passages in their literary context to trace this connection across the canon.",
		],
		development: [
			"Development",
			"Trace how this theme is developed through the Old Testament, inaugurated by Christ, and carried forward in the church.",
		],
		"theological-significance": [
			"Theological Significance",
			"This connection shows the unity of Scripture and God’s consistent purpose throughout the biblical story.",
		],
		"related-connections": [
			"Related Connections",
			"Explore connections involving covenant, kingship, promise, fulfillment, and new creation.",
		],
	} as const satisfies Record<
		Exclude<DetailTab, "overview">,
		readonly [string, string]
	>;
	const [heading, text] = content[tab];
	return (
		<section className="rounded-[9px] border border-[#e5e9eb] bg-[#fcfdfd] px-6 py-12 text-center dark:border-border dark:bg-muted/30">
			<h3 className="font-serif text-[#294b6c] text-xl dark:text-foreground">
				{heading}
			</h3>
			<p className="mx-auto mt-2 max-w-[620px] text-[#627a92] text-sm leading-6 dark:text-muted-foreground">
				{text}
			</p>
		</section>
	);
}
