import { cn } from "@berean-study/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	BarChart3Icon,
	BookOpenIcon,
	KeyRoundIcon,
	LandmarkIcon,
	LanguagesIcon,
	LightbulbIcon,
	LinkIcon,
	SearchIcon,
	StarIcon,
	TextIcon,
} from "lucide-react";
import { useState } from "react";

type LanguageFilter =
	| "all"
	| "aramaic"
	| "grammar"
	| "greek"
	| "hebrew"
	| "important-passages"
	| "key-terms"
	| "word-studies";

type StudyTone = "blue" | "gold" | "green" | "plum" | "umber";

type WordStudy = {
	category: Exclude<LanguageFilter, "all">;
	description: string;
	id: string;
	language: string;
	originalWord: string;
	passage: string;
	term: string;
	tone: StudyTone;
	transliteration: string;
};

const filters = [
	{ label: "All", value: "all" },
	{ label: "Greek", value: "greek" },
	{ label: "Hebrew", value: "hebrew" },
	{ label: "Aramaic", value: "aramaic" },
	{ label: "Key Terms", value: "key-terms" },
	{ label: "Grammar", value: "grammar" },
	{ label: "Word Studies", value: "word-studies" },
	{ label: "Important Passages", value: "important-passages" },
] as const satisfies readonly { label: string; value: LanguageFilter }[];

const studyTypes = [
	{
		description:
			"Explore the meaning and usage of individual Hebrew, Aramaic, and Greek words.",
		icon: BookOpenIcon,
		id: "word-studies",
		labels: ["Logos", "Hesed"],
		title: "Word Studies",
		tone: "blue",
	},
	{
		description:
			"See how important words are used in their biblical and historical context.",
		icon: KeyRoundIcon,
		id: "key-terms",
		labels: ["Grace", "Faith"],
		title: "Key Terms in Context",
		tone: "green",
	},
	{
		description:
			"Discover how grammar, sentence structure, and literary features shape meaning.",
		icon: TextIcon,
		id: "grammar",
		labels: ["Verb Tenses", "Cases"],
		title: "Grammar & Syntax",
		tone: "plum",
	},
	{
		description:
			"Explore unique features and significant patterns in the original languages.",
		icon: LandmarkIcon,
		id: "highlights",
		labels: ["Hebrew", "Greek"],
		title: "Hebrew & Greek Highlights",
		tone: "umber",
	},
	{
		description:
			"Study key passages where original language insights clarify meaning.",
		icon: LanguagesIcon,
		id: "important-passages",
		labels: ["John 1:1", "Genesis 1:1"],
		title: "Important Passages",
		tone: "blue",
	},
] as const satisfies readonly {
	description: string;
	icon: LucideIcon;
	id: string;
	labels: readonly string[];
	title: string;
	tone: StudyTone;
}[];

const wordStudies = [
	{
		category: "greek",
		description:
			"Word, message, reason — the eternal, personal, and divine expression of God.",
		id: "logos",
		language: "Greek",
		originalWord: "λόγος",
		passage: "John 1:1",
		term: "Logos",
		tone: "gold",
		transliteration: "Logos",
	},
	{
		category: "greek",
		description:
			"Grace, unmerited favor — God’s kindness toward those who do not deserve it.",
		id: "charis",
		language: "Greek",
		originalWord: "χάρις",
		passage: "Ephesians 2:8",
		term: "Grace",
		tone: "blue",
		transliteration: "Charis",
	},
	{
		category: "hebrew",
		description:
			"Lovingkindness, covenant faithfulness — God’s steadfast love and mercy.",
		id: "hesed",
		language: "Hebrew",
		originalWord: "חסד",
		passage: "Psalm 136",
		term: "Hesed",
		tone: "green",
		transliteration: "Hesed",
	},
	{
		category: "key-terms",
		description:
			"Righteousness — God’s declared right standing given through faith in Christ.",
		id: "dikaiosyne",
		language: "Greek",
		originalWord: "δικαιοσύνη",
		passage: "Romans 3:21–26",
		term: "Righteousness",
		tone: "plum",
		transliteration: "Dikaiosynē",
	},
	{
		category: "hebrew",
		description:
			"Spirit, wind, breath — God’s active presence, power, and life-giving force.",
		id: "ruach",
		language: "Hebrew",
		originalWord: "רוח",
		passage: "Genesis 1:2",
		term: "Ruach",
		tone: "blue",
		transliteration: "Ruach",
	},
] as const satisfies readonly WordStudy[];

const toneClasses: Record<StudyTone, string> = {
	blue: "bg-[#257eae]",
	gold: "bg-[#c58a31]",
	green: "bg-[#377f61]",
	plum: "bg-[#8351ad]",
	umber: "bg-[#8b5d32]",
};

const wordStudyBackgrounds: Record<StudyTone, string> = {
	blue: "bg-[#eaf5f9]",
	gold: "bg-[#fdf6e8]",
	green: "bg-[#edf6ef]",
	plum: "bg-[#f4ecfa]",
	umber: "bg-[#f8f0e9]",
};

export function OriginalLanguagePage() {
	const [filter, setFilter] = useState<LanguageFilter>("all");
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const visibleStudies = wordStudies.filter((study) => {
		const matchesFilter =
			filter === "all" ||
			study.category === filter ||
			(filter === "greek" && study.language === "Greek") ||
			(filter === "hebrew" && study.language === "Hebrew") ||
			filter === "word-studies" ||
			(filter === "important-passages" && study.passage.length > 0);
		const searchableText = [
			study.originalWord,
			study.transliteration,
			study.term,
			study.description,
			study.passage,
			study.language,
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
						<OriginalLanguageHeader
							filter={filter}
							onFilterChange={setFilter}
							onQueryChange={setQuery}
							query={query}
						/>
						<FeaturedStudy />
						<StudyTypes />
						<FeaturedWordStudies
							onReset={resetFilters}
							studies={visibleStudies}
						/>
						<CarefulStudyProcess />
					</div>

					<OriginalLanguageGuide />
				</div>
			</div>
		</main>
	);
}

function OriginalLanguageHeader({
	filter,
	onFilterChange,
	onQueryChange,
	query,
}: {
	filter: LanguageFilter;
	onFilterChange: (filter: LanguageFilter) => void;
	onQueryChange: (query: string) => void;
	query: string;
}) {
	return (
		<header>
			<p className="font-semibold text-[#36577a] text-[10px] uppercase tracking-[0.06em] dark:text-primary">
				Study Tools
			</p>
			<h1 className="mt-2 font-serif text-[#17365e] text-[42px] leading-none tracking-[-0.035em] dark:text-foreground">
				Original Language
			</h1>
			<p className="mt-4 max-w-[710px] text-[#405f80] text-[15px] leading-[1.6] dark:text-muted-foreground">
				Explore meaningful Hebrew, Aramaic, and Greek observations to better
				understand Scripture in context.
			</p>

			<div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
				<label
					className="relative min-w-0 flex-1"
					htmlFor="original-language-search"
				>
					<span className="sr-only">Search original language studies</span>
					<SearchIcon
						aria-hidden="true"
						className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#507294]"
						strokeWidth={1.8}
					/>
					<input
						className="h-9 w-full rounded-lg border border-[#e6e2db] bg-white py-2 pr-3 pl-10 text-[#355675] text-[11px] shadow-[0_1px_3px_rgba(24,50,79,0.05)] outline-none placeholder:text-[#8293a6] focus:border-[#c79c58] focus:ring-2 focus:ring-[#d8c79e]/25 dark:border-border dark:bg-card dark:text-foreground"
						id="original-language-search"
						onChange={(event) => onQueryChange(event.target.value)}
						placeholder="Search words, lemmas, passages, or concepts..."
						type="search"
						value={query}
					/>
				</label>
				<div className="flex flex-wrap gap-2">
					{filters.map((item) => (
						<button
							aria-pressed={filter === item.value}
							className={cn(
								"h-8 rounded-full border px-3 text-[10px] transition-colors",
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

function FeaturedStudy() {
	return (
		<section className="relative mt-4 min-h-[223px] overflow-hidden rounded-lg border border-[#e4dfd5] bg-[#f8f4ec] shadow-[0_2px_7px_rgba(24,50,79,0.05)]">
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[position:65%_center] bg-[url('/landing/cta-hills.png')] bg-cover bg-no-repeat"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[linear-gradient(90deg,#fcfbf7_0%,#fcfbf7_28%,rgba(252,251,247,0.97)_40%,rgba(252,251,247,0.69)_56%,rgba(252,251,247,0.12)_82%,transparent_100%)] dark:bg-[linear-gradient(90deg,var(--card)_0%,var(--card)_44%,rgba(0,0,0,0.2)_73%,transparent_100%)]"
			/>
			<div className="relative z-10 max-w-[570px] px-7 py-5 sm:px-9 sm:py-6">
				<p className="flex items-center gap-1.5 font-semibold text-[#a4742f] text-[10px] uppercase tracking-[0.04em]">
					<StarIcon aria-hidden="true" className="size-3 fill-current" />
					Featured Study
				</p>
				<h2 className="mt-2 font-serif text-[#17365e] text-[29px] leading-none tracking-[-0.03em] dark:text-foreground">
					The Meaning of Logos in John 1:1
				</h2>
				<p className="mt-2 max-w-[510px] text-[#58708a] text-[12px] leading-[1.55] dark:text-muted-foreground">
					The Greek word <i>logos</i> (λόγος) in John 1:1 is rich with meaning.
					It can refer to word, message, reason, or divine expression. In this
					passage, <i>logos</i> highlights the eternal, personal, and creative
					nature of Christ, showing that He is the ultimate revelation of God.
				</p>
				<div className="mt-3 flex flex-wrap gap-2">
					{["John 1:1", "Greek: Λόγος", "Word Study", "Divine Revelation"].map(
						(label) => (
							<span
								className="rounded-md border border-[#dce2e4] bg-white/72 px-2 py-1 text-[#496b89] text-[9px] shadow-sm backdrop-blur-sm"
								key={label}
							>
								{label}
							</span>
						),
					)}
				</div>
				<div className="mt-3 flex flex-wrap gap-3">
					<button
						className="inline-flex h-9 items-center gap-2 rounded-md bg-[#b78332] px-5 font-medium text-[11px] text-white shadow-sm transition-colors hover:bg-[#a57429]"
						type="button"
					>
						Explore this study
						<ArrowRightIcon aria-hidden="true" className="size-3.5" />
					</button>
					<button
						className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e3e2dd] bg-white/75 px-5 font-medium text-[#496b89] text-[11px] shadow-sm transition-colors hover:bg-white"
						type="button"
					>
						<BookOpenIcon aria-hidden="true" className="size-3.5" />
						See passage context
					</button>
				</div>
			</div>
		</section>
	);
}

function StudyTypes() {
	return (
		<section aria-labelledby="study-types-heading" className="mt-4">
			<div className="flex items-start gap-3">
				<BookOpenIcon
					aria-hidden="true"
					className="mt-0.5 size-6 shrink-0 text-[#173d67]"
					strokeWidth={1.7}
				/>
				<div>
					<h2
						className="font-serif text-[#17365e] text-[20px] leading-6 dark:text-foreground"
						id="study-types-heading"
					>
						Explore by Study Type
					</h2>
					<p className="mt-0.5 text-[#68809b] text-[10px] leading-[1.5] dark:text-muted-foreground">
						Choose a study approach to explore original language insights.
					</p>
				</div>
			</div>
			<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				{studyTypes.map((studyType) => (
					<StudyTypeCard key={studyType.id} studyType={studyType} />
				))}
			</div>
		</section>
	);
}

function StudyTypeCard({
	studyType,
}: {
	studyType: (typeof studyTypes)[number];
}) {
	const Icon = studyType.icon;
	return (
		<article className="flex min-h-[130px] flex-col rounded-lg border border-[#ebe8e2] bg-white p-3 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card">
			<div className="flex gap-3">
				<div
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-md text-white shadow-sm",
						toneClasses[studyType.tone],
					)}
				>
					<Icon aria-hidden="true" className="size-4" strokeWidth={2} />
				</div>
				<div className="min-w-0">
					<h3 className="font-serif text-[#284767] text-[12px] leading-4 dark:text-foreground">
						{studyType.title}
					</h3>
					<p className="mt-1 text-[#71849a] text-[9px] leading-[1.4] dark:text-muted-foreground">
						{studyType.description}
					</p>
				</div>
			</div>
			<div className="mt-auto flex items-center justify-between gap-2 pt-3">
				<div className="flex min-w-0 flex-wrap gap-1">
					{studyType.labels.map((label) => (
						<span
							className="truncate rounded bg-[#f0f3f5] px-1.5 py-1 text-[#607891] text-[8px]"
							key={label}
						>
							{label}
						</span>
					))}
				</div>
				<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f4f2ed] text-[#60748a]">
					<ArrowRightIcon aria-hidden="true" className="size-3" />
				</span>
			</div>
		</article>
	);
}

function FeaturedWordStudies({
	onReset,
	studies,
}: {
	onReset: () => void;
	studies: readonly WordStudy[];
}) {
	return (
		<section aria-labelledby="word-studies-heading" className="mt-4">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-start gap-3">
					<BookOpenIcon
						aria-hidden="true"
						className="mt-0.5 size-6 shrink-0 text-[#173d67]"
						strokeWidth={1.9}
					/>
					<div>
						<h2
							className="font-serif text-[#17365e] text-[20px] leading-6 dark:text-foreground"
							id="word-studies-heading"
						>
							Featured Word Studies
						</h2>
						<p className="mt-0.5 text-[#68809b] text-[10px] leading-[1.5] dark:text-muted-foreground">
							Explore important words from the original languages and see how
							they deepen your understanding of Scripture.
						</p>
					</div>
				</div>
				<button
					className="hidden h-8 shrink-0 items-center gap-2 rounded-md border border-[#e3e4e1] bg-white px-3 text-[#426588] text-[10px] shadow-sm hover:bg-[#faf9f5] sm:inline-flex"
					onClick={onReset}
					type="button"
				>
					View all word studies
					<ArrowRightIcon aria-hidden="true" className="size-3" />
				</button>
			</div>
			{studies.length > 0 ? (
				<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
					{studies.map((study) => (
						<WordStudyCard key={study.id} study={study} />
					))}
				</div>
			) : (
				<div className="mt-3 rounded-lg border border-[#dbd8d1] border-dashed bg-white/65 px-5 py-9 text-center dark:border-border dark:bg-card/70">
					<h3 className="font-serif text-[#294562] text-lg dark:text-foreground">
						No word studies found
					</h3>
					<p className="mt-1 text-[#71839a] text-sm dark:text-muted-foreground">
						Try a different search or clear the selected filter.
					</p>
					<button
						className="mt-4 rounded-md bg-[#f5ead7] px-3 py-2 font-medium text-[#76582c] text-xs"
						onClick={onReset}
						type="button"
					>
						Show all word studies
					</button>
				</div>
			)}
		</section>
	);
}

function WordStudyCard({ study }: { study: WordStudy }) {
	return (
		<article className="flex min-h-[144px] flex-col overflow-hidden rounded-lg border border-[#ebe8e2] bg-white p-3 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card">
			<div
				className={cn(
					"-mx-3 -mt-3 px-3 pt-2 pb-1.5",
					wordStudyBackgrounds[study.tone],
				)}
			>
				<p className="font-serif text-[#263f5b] text-[20px] leading-5 dark:text-foreground">
					{study.originalWord}
				</p>
				<p className="mt-0.5 text-[#54718f] text-[9px]">
					{study.transliteration}
				</p>
			</div>
			<p className="mt-2 text-[#406588] text-[9px]">{study.passage}</p>
			<p className="mt-1 line-clamp-3 text-[#71849a] text-[9px] leading-[1.35] dark:text-muted-foreground">
				{study.description}
			</p>
			<div className="mt-auto flex items-center justify-between gap-2 pt-2">
				<span className="text-[#71849a] text-[8px]">{study.language}</span>
				<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f4f2ed] text-[#60748a]">
					<ArrowRightIcon aria-hidden="true" className="size-3" />
				</span>
			</div>
		</article>
	);
}

function CarefulStudyProcess() {
	const steps = [
		{
			description:
				"Read the surrounding verses to understand the flow of thought.",
			title: "Start with the passage in context",
		},
		{
			description:
				"Look at the part of speech, grammar, and role in the sentence.",
			title: "Notice how the word functions",
		},
		{
			description:
				"See how the word is used in other passages to identify consistent themes and patterns.",
			title: "Compare related uses",
		},
		{
			description:
				"Let the context determine the meaning, rather than forcing every possible meaning onto the word.",
			title: "Avoid overloading one word",
		},
	] as const;
	return (
		<section aria-labelledby="careful-study-heading" className="mt-4">
			<div className="flex items-start gap-3">
				<LanguagesIcon
					aria-hidden="true"
					className="mt-0.5 size-6 shrink-0 text-[#173d67]"
					strokeWidth={1.9}
				/>
				<div>
					<h2
						className="font-serif text-[#17365e] text-[20px] leading-6 dark:text-foreground"
						id="careful-study-heading"
					>
						How to Study Original Language Carefully
					</h2>
					<p className="mt-0.5 text-[#68809b] text-[10px] leading-[1.5] dark:text-muted-foreground">
						Follow these principles to get the most from your study of Hebrew,
						Aramaic, and Greek.
					</p>
				</div>
			</div>
			<div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
				{steps.map((step, index) => (
					<div
						className="flex items-start gap-3 rounded-lg border border-[#ebe8e2] bg-white p-3 dark:border-border dark:bg-card"
						key={step.title}
					>
						<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#fbf1df] font-serif text-[#8d672b] text-[14px]">
							{index + 1}
						</span>
						<div>
							<h3 className="font-serif text-[#294967] text-[11px] leading-4 dark:text-foreground">
								{step.title}
							</h3>
							<p className="mt-1 text-[#71849a] text-[9px] leading-[1.4] dark:text-muted-foreground">
								{step.description}
							</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function OriginalLanguageGuide() {
	const helpItems = [
		{
			description:
				"Discover the full range of meaning behind important Hebrew, Aramaic, and Greek words.",
			icon: BookOpenIcon,
			title: "Understand Key Terms",
		},
		{
			description:
				"Notice how word choices, grammar, and structure highlight key truths in the text.",
			icon: BarChart3Icon,
			title: "See Emphasis and Nuance",
		},
		{
			description:
				"Learn how grammatical features shape the meaning of a passage.",
			icon: KeyRoundIcon,
			title: "Recognize Grammar Insights",
		},
		{
			description:
				"See how the same word is used in different contexts to gain a fuller understanding.",
			icon: LinkIcon,
			title: "Compare Usage Across Scripture",
		},
	] as const;
	const suggestions = [
		"Read the passage in context before focusing on a single word.",
		"Look at how the word is used elsewhere in Scripture.",
		"Consider grammar, literary context, and historical setting.",
		"Compare multiple translations and study resources.",
		"Be humble and open, recognizing that some meanings may be debated.",
	] as const;
	return (
		<aside className="space-y-4">
			<section className="rounded-lg border border-[#e8e3da] bg-white/60 px-5 py-5 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70">
				<h2 className="font-serif text-[#294562] text-[18px] dark:text-foreground">
					How Original Language Helps
				</h2>
				<div className="mt-4 space-y-4">
					{helpItems.map((item) => {
						const Icon = item.icon;
						return (
							<div className="flex gap-3" key={item.title}>
								<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#fcf5e9] text-[#ad7830]">
									<Icon
										aria-hidden="true"
										className="size-[18px]"
										strokeWidth={1.8}
									/>
								</div>
								<div>
									<h3 className="font-serif text-[#294562] text-[13px] leading-4 dark:text-foreground">
										{item.title}
									</h3>
									<p className="mt-1 text-[#71849a] text-[10px] leading-[1.45] dark:text-muted-foreground">
										{item.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</section>
			<section className="rounded-lg border border-[#e8e3da] bg-white/60 px-5 py-5 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70">
				<h2 className="flex items-center gap-2 font-serif text-[#294562] text-[18px] dark:text-foreground">
					<LightbulbIcon aria-hidden="true" className="size-5 text-[#ad7830]" />
					Study Suggestions
				</h2>
				<ol className="mt-4 space-y-4">
					{suggestions.map((suggestion, index) => (
						<li className="flex gap-3" key={suggestion}>
							<span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#eee4d4] bg-[#fcf8ef] font-medium text-[#8b7554] text-[11px]">
								{index + 1}
							</span>
							<p className="pt-0.5 text-[#6b8098] text-[10px] leading-[1.45] dark:text-muted-foreground">
								{suggestion}
							</p>
						</li>
					))}
				</ol>
			</section>
			<blockquote className="rounded-lg border border-[#e8e3da] bg-white/60 px-5 py-5 font-serif text-[#5e7189] text-[13px] italic leading-[1.55] shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70 dark:text-muted-foreground">
				“All Scripture is God-breathed and is useful for teaching, for rebuking,
				for correcting, and for training in righteousness.”
				<cite className="mt-3 block font-sans text-[#75879a] text-[9px] not-italic">
					2 Timothy 3:16
				</cite>
			</blockquote>
		</aside>
	);
}
