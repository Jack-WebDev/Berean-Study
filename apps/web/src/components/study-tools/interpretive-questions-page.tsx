import { cn } from "@berean-study/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	BarChart3Icon,
	BookOpenIcon,
	CircleUserRoundIcon,
	CrossIcon,
	CrownIcon,
	KeyRoundIcon,
	LightbulbIcon,
	LinkIcon,
	SearchIcon,
	StarIcon,
	UsersRoundIcon,
} from "lucide-react";
import { useState } from "react";

type QuestionFilter =
	| "all"
	| "church-practice"
	| "doctrine"
	| "gospels"
	| "new-testament"
	| "old-testament"
	| "pauline-letters";

type QuestionTone = "blue" | "gold" | "green" | "plum" | "red";

type InterpretiveQuestion = {
	category: Exclude<QuestionFilter, "all">;
	description: string;
	icon: LucideIcon;
	id: string;
	passage: string;
	title: string;
	views: string;
};

const filters = [
	{ label: "All", value: "all" },
	{ label: "Old Testament", value: "old-testament" },
	{ label: "New Testament", value: "new-testament" },
	{ label: "Pauline Letters", value: "pauline-letters" },
	{ label: "Gospels", value: "gospels" },
	{ label: "Doctrine", value: "doctrine" },
	{ label: "Church Practice", value: "church-practice" },
] as const satisfies readonly { label: string; value: QuestionFilter }[];

const questionTypes = [
	{
		description: "Questions about who is speaking in a passage and to whom.",
		icon: CircleUserRoundIcon,
		id: "speaker",
		passages: ["Romans 7", "Hebrews 1"],
		title: "Identity of the Speaker",
		tone: "gold",
	},
	{
		description: "Explore the meaning and significance of important words.",
		icon: KeyRoundIcon,
		id: "key-term",
		passages: ["Justification", "Election"],
		title: "Meaning of a Key Term",
		tone: "green",
	},
	{
		description: "Questions about how salvation works and its extent.",
		icon: CrossIcon,
		id: "salvation",
		passages: ["Romans 9", "Ephesians 2"],
		title: "Nature of Salvation",
		tone: "plum",
	},
	{
		description:
			"Interpretive questions about Christian living, worship, and practice.",
		icon: UsersRoundIcon,
		id: "church-practice",
		passages: ["Baptism", "Lord's Supper"],
		title: "Church Practice",
		tone: "blue",
	},
	{
		description: "Questions about the interpretation of prophetic passages.",
		icon: CrownIcon,
		id: "prophecy",
		passages: ["Daniel", "Revelation"],
		title: "Prophecy & Fulfillment",
		tone: "red",
	},
] as const satisfies readonly {
	description: string;
	icon: LucideIcon;
	id: string;
	passages: readonly string[];
	title: string;
	tone: QuestionTone;
}[];

const questions = [
	{
		category: "old-testament",
		description:
			"Explore the main views on the identity of the ‘sons of God’ and the nature of their union with human women.",
		icon: CircleUserRoundIcon,
		id: "sons-of-god",
		passage: "Genesis 6:1–4",
		title: "Who are the ‘sons of God’ in Genesis 6?",
		views: "3 major views",
	},
	{
		category: "gospels",
		description:
			"Compare the main views on whether the ‘rock’ refers to Peter, Christ, Peter's confession, or something else.",
		icon: StarIcon,
		id: "rock-matthew",
		passage: "Matthew 16:13–20",
		title: "What is the ‘rock’ in Matthew 16:18?",
		views: "4 major views",
	},
	{
		category: "pauline-letters",
		description:
			"Explore the major views on God's election, including individual, corporate, and conditional understandings.",
		icon: UsersRoundIcon,
		id: "election-romans",
		passage: "Romans 9:1–24",
		title: "What is Paul discussing in Romans 9?",
		views: "3 major views",
	},
	{
		category: "church-practice",
		description:
			"Examine the major interpretations of this difficult passage and the historical context.",
		icon: BookOpenIcon,
		id: "baptism-dead",
		passage: "1 Corinthians 15:29",
		title: "What does ‘baptism for the dead’ mean in 1 Corinthians 15:29?",
		views: "3 major views",
	},
	{
		category: "new-testament",
		description:
			"Explore the main views on the identity of the restrainer and what is being restrained.",
		icon: LightbulbIcon,
		id: "restrainer",
		passage: "2 Thessalonians 2:1–8",
		title: "Who is the restrainer in 2 Thessalonians 2?",
		views: "3 major views",
	},
	{
		category: "doctrine",
		description:
			"Compare the main views on the meaning of ‘head’ and its implications for church practice.",
		icon: BookOpenIcon,
		id: "head-corinthians",
		passage: "1 Corinthians 11:2–16",
		title: "What is the meaning of ‘head’ in 1 Corinthians 11?",
		views: "3 major views",
	},
] as const satisfies readonly InterpretiveQuestion[];

const toneClasses: Record<QuestionTone, string> = {
	blue: "bg-[#2588ba]",
	gold: "bg-[#c79039]",
	green: "bg-[#3d916c]",
	plum: "bg-[#8050b7]",
	red: "bg-[#bc5144]",
};

export function InterpretiveQuestionsPage() {
	const [filter, setFilter] = useState<QuestionFilter>("all");
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const visibleQuestions = questions.filter((question) => {
		const matchesFilter = filter === "all" || question.category === filter;
		const searchableText = [
			question.title,
			question.description,
			question.passage,
			question.category.replaceAll("-", " "),
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
						<QuestionsHeader
							filter={filter}
							onFilterChange={setFilter}
							onQueryChange={setQuery}
							query={query}
						/>
						<FeaturedQuestion />
						<QuestionTypes />
						<FeaturedQuestions
							questions={visibleQuestions}
							onReset={resetFilters}
						/>
						<QuestionStudyProcess />
					</div>

					<QuestionsGuide />
				</div>
			</div>
		</main>
	);
}

function QuestionsHeader({
	filter,
	onFilterChange,
	onQueryChange,
	query,
}: {
	filter: QuestionFilter;
	onFilterChange: (filter: QuestionFilter) => void;
	onQueryChange: (query: string) => void;
	query: string;
}) {
	return (
		<header>
			<p className="font-semibold text-[#36577a] text-[10px] uppercase tracking-[0.06em] dark:text-primary">
				Study Tools
			</p>
			<h1 className="mt-2 font-serif text-[#17365e] text-[42px] leading-none tracking-[-0.035em] dark:text-foreground">
				Interpretive Questions
			</h1>
			<p className="mt-4 max-w-[760px] text-[#405f80] text-[15px] leading-[1.6] dark:text-muted-foreground">
				Explore genuine areas of interpretive debate, compare major views
				fairly, and study supporting passages to gain a deeper understanding of
				Scripture.
			</p>

			<div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
				<label
					className="relative min-w-0 flex-1"
					htmlFor="interpretive-question-search"
				>
					<span className="sr-only">Search interpretive questions</span>
					<SearchIcon
						aria-hidden="true"
						className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#507294]"
						strokeWidth={1.8}
					/>
					<input
						className="h-10 w-full rounded-lg border border-[#e6e2db] bg-white py-2 pr-3 pl-10 text-[#355675] text-[12px] shadow-[0_1px_3px_rgba(24,50,79,0.05)] outline-none placeholder:text-[#8293a6] focus:border-[#c79c58] focus:ring-2 focus:ring-[#d8c79e]/25 dark:border-border dark:bg-card dark:text-foreground"
						id="interpretive-question-search"
						onChange={(event) => onQueryChange(event.target.value)}
						placeholder="Search questions, passages, or topics..."
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

function FeaturedQuestion() {
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
					Featured Question
				</p>
				<h2 className="mt-2 font-serif text-[#17365e] text-[38px] leading-none tracking-[-0.03em] dark:text-foreground">
					What does Paul mean in Romans 7:14–25?
				</h2>
				<p className="mt-3 max-w-[540px] text-[#58708a] text-[13px] leading-[1.6] dark:text-muted-foreground">
					Romans 7:14–25 is a much-discussed passage with several faithful
					interpretations. Is Paul describing a believer&apos;s ongoing
					struggle, a pre-conversion experience, or using a literary device?
					Explore the major views and study the supporting passages to see how
					each interpretation understands the context and flow of Paul&apos;s
					argument.
				</p>
				<div className="mt-5 flex flex-wrap gap-2">
					{["Romans 7:14–25", "Romans 6–8", "Galatians 5:16–24"].map(
						(passage) => (
							<span
								className="rounded-md border border-[#dce2e4] bg-white/72 px-2.5 py-1.5 text-[#496b89] text-[10px] shadow-sm backdrop-blur-sm"
								key={passage}
							>
								{passage}
							</span>
						),
					)}
				</div>
				<div className="mt-5 flex flex-wrap gap-3">
					<button
						className="inline-flex h-10 items-center gap-2 rounded-md bg-[#b78332] px-5 font-medium text-[12px] text-white shadow-sm transition-colors hover:bg-[#a57429]"
						type="button"
					>
						Explore views
						<ArrowRightIcon aria-hidden="true" className="size-3.5" />
					</button>
					<button
						className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e3e2dd] bg-white/75 px-5 font-medium text-[#496b89] text-[12px] shadow-sm transition-colors hover:bg-white"
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

function QuestionTypes() {
	return (
		<section aria-labelledby="question-types-heading" className="mt-8">
			<div className="flex items-start gap-4">
				<BookOpenIcon
					aria-hidden="true"
					className="mt-0.5 size-7 shrink-0 text-[#173d67]"
					strokeWidth={1.7}
				/>
				<div>
					<h2
						className="font-serif text-[#17365e] text-[21px] leading-6 dark:text-foreground"
						id="question-types-heading"
					>
						Browse by Question Type
					</h2>
					<p className="mt-1 text-[#68809b] text-[11px] leading-[1.5] dark:text-muted-foreground">
						Explore different categories of interpretive questions to find
						topics that interest you.
					</p>
				</div>
			</div>
			<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				{questionTypes.map((questionType) => (
					<QuestionTypeCard key={questionType.id} questionType={questionType} />
				))}
			</div>
		</section>
	);
}

function QuestionTypeCard({
	questionType,
}: {
	questionType: (typeof questionTypes)[number];
}) {
	const Icon = questionType.icon;

	return (
		<article className="flex min-h-[174px] flex-col rounded-lg border border-[#ebe8e2] bg-white p-4 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card">
			<div className="flex gap-3">
				<div
					className={cn(
						"flex size-9 shrink-0 items-center justify-center rounded-md text-white shadow-sm",
						toneClasses[questionType.tone],
					)}
				>
					<Icon aria-hidden="true" className="size-4" strokeWidth={2} />
				</div>
				<div className="min-w-0">
					<h3 className="font-serif text-[#284767] text-[13px] leading-4 dark:text-foreground">
						{questionType.title}
					</h3>
					<p className="mt-1.5 text-[#71849a] text-[10px] leading-[1.45] dark:text-muted-foreground">
						{questionType.description}
					</p>
				</div>
			</div>
			<div className="mt-auto flex items-center justify-between gap-3 pt-4">
				<div className="flex min-w-0 flex-wrap gap-1">
					{questionType.passages.map((passage) => (
						<span
							className="truncate rounded bg-[#f0f3f5] px-1.5 py-1 text-[#607891] text-[8px]"
							key={passage}
						>
							{passage}
						</span>
					))}
				</div>
				<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f4f2ed] text-[#60748a]">
					<ArrowRightIcon aria-hidden="true" className="size-3" />
				</span>
			</div>
		</article>
	);
}

function FeaturedQuestions({
	onReset,
	questions,
}: {
	onReset: () => void;
	questions: readonly InterpretiveQuestion[];
}) {
	return (
		<section aria-labelledby="featured-questions-heading" className="mt-8">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-start gap-4">
					<BookOpenIcon
						aria-hidden="true"
						className="mt-0.5 size-6 shrink-0 text-[#173d67]"
						strokeWidth={1.9}
					/>
					<div>
						<h2
							className="font-serif text-[#17365e] text-[21px] leading-6 dark:text-foreground"
							id="featured-questions-heading"
						>
							Featured Questions
						</h2>
						<p className="mt-1 text-[#68809b] text-[11px] leading-[1.5] dark:text-muted-foreground">
							Read popular interpretive questions and explore the major views
							and supporting passages for each.
						</p>
					</div>
				</div>
				<button
					className="hidden h-9 shrink-0 items-center gap-2 rounded-md border border-[#e3e4e1] bg-white px-4 text-[#426588] text-[11px] shadow-sm hover:bg-[#faf9f5] sm:inline-flex"
					onClick={onReset}
					type="button"
				>
					View all questions
					<ArrowRightIcon aria-hidden="true" className="size-3" />
				</button>
			</div>
			{questions.length > 0 ? (
				<div className="mt-5 grid gap-3 md:grid-cols-2">
					{questions.map((question) => (
						<FeaturedQuestionCard key={question.id} question={question} />
					))}
				</div>
			) : (
				<div className="mt-3 rounded-lg border border-[#dbd8d1] border-dashed bg-white/65 px-5 py-9 text-center dark:border-border dark:bg-card/70">
					<h3 className="font-serif text-[#294562] text-lg dark:text-foreground">
						No questions found
					</h3>
					<p className="mt-1 text-[#71839a] text-sm dark:text-muted-foreground">
						Try a different search or clear the selected filter.
					</p>
					<button
						className="mt-4 rounded-md bg-[#f5ead7] px-3 py-2 font-medium text-[#76582c] text-xs"
						onClick={onReset}
						type="button"
					>
						Show all questions
					</button>
				</div>
			)}
		</section>
	);
}

function FeaturedQuestionCard({
	question,
}: {
	question: InterpretiveQuestion;
}) {
	const Icon = question.icon;

	return (
		<article className="flex min-h-[112px] items-center gap-3 rounded-lg border border-[#ebe8e2] bg-white p-3.5 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#fbf4e7] text-[#a97732]">
				<Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<h3 className="font-serif text-[#294967] text-[13px] leading-4 dark:text-foreground">
						{question.title}
					</h3>
					<span className="shrink-0 text-[#72869d] text-[8px]">
						{question.views}
					</span>
				</div>
				<p className="mt-1 inline-block rounded bg-[#eef2f4] px-1.5 py-0.5 text-[#557493] text-[8px]">
					{question.passage}
				</p>
				<p className="mt-1 line-clamp-2 text-[#71849a] text-[10px] leading-[1.4] dark:text-muted-foreground">
					{question.description}
				</p>
			</div>
			<ArrowRightIcon
				aria-hidden="true"
				className="size-4 shrink-0 text-[#60748a]"
			/>
		</article>
	);
}

function QuestionStudyProcess() {
	const steps = [
		{
			description:
				"Understand the question, the key passages, and why it is debated.",
			title: "The Question",
		},
		{
			description:
				"Explore the main interpretations with clear, fair summaries.",
			title: "Major Views",
		},
		{
			description:
				"Study the key texts used by each view and see how they fit in the bigger picture.",
			title: "Supporting Passages",
		},
	] as const;

	return (
		<section aria-labelledby="question-process-heading" className="mt-8">
			<div className="flex items-start gap-4">
				<BookOpenIcon
					aria-hidden="true"
					className="mt-0.5 size-6 shrink-0 text-[#173d67]"
					strokeWidth={1.9}
				/>
				<div>
					<h2
						className="font-serif text-[#17365e] text-[21px] leading-6 dark:text-foreground"
						id="question-process-heading"
					>
						How a Question is Studied
					</h2>
					<p className="mt-1 text-[#68809b] text-[11px] leading-[1.5] dark:text-muted-foreground">
						Each question follows a simple process to help you compare views
						fairly and study the supporting evidence.
					</p>
				</div>
			</div>
			<div className="mt-5 grid gap-3 md:grid-cols-3">
				{steps.map((step, index) => (
					<div
						className="flex items-start gap-3 rounded-lg border border-[#ebe8e2] bg-white p-4 dark:border-border dark:bg-card"
						key={step.title}
					>
						<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fbf1df] font-serif text-[#8d672b] text-[16px]">
							{index + 1}
						</span>
						<div>
							<h3 className="font-serif text-[#294967] text-[13px] dark:text-foreground">
								{step.title}
							</h3>
							<p className="mt-1 text-[#71849a] text-[10px] leading-[1.45] dark:text-muted-foreground">
								{step.description}
							</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function QuestionsGuide() {
	const helpItems = [
		{
			description:
				"Engage with real areas of debate where faithful Christians differ in interpretation.",
			icon: BookOpenIcon,
			title: "Explore Genuine Questions",
		},
		{
			description:
				"See multiple perspectives presented accurately and charitably.",
			icon: StarIcon,
			title: "Compare Views Fairly",
		},
		{
			description:
				"Examine the key texts used by each view and how they connect across Scripture.",
			icon: LinkIcon,
			title: "Study Supporting Passages",
		},
		{
			description:
				"Develop a more informed, nuanced, and charitable understanding of God’s Word.",
			icon: BarChart3Icon,
			title: "Grow in Understanding",
		},
	] as const;
	const suggestions = [
		"Read the primary passage carefully in context.",
		"Compare the major views and how they understand the text.",
		"Study the supporting passages for each view.",
		"Note the strengths and tensions of each interpretation.",
		"Approach the question with humility, seeking to understand before drawing conclusions.",
	] as const;

	return (
		<aside className="space-y-5">
			<section className="rounded-lg border border-[#e8e3da] bg-white/60 px-6 py-6 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70">
				<h2 className="font-serif text-[#294562] text-[19px] dark:text-foreground">
					How Interpretive Questions Help
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

			<blockquote className="rounded-lg border border-[#e8e3da] bg-white/60 px-6 py-6 font-serif text-[#5e7189] text-[14px] italic leading-[1.55] shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70 dark:text-muted-foreground">
				“Be diligent to present yourself approved to God, a worker who does not
				need to be ashamed, rightly dividing the word of truth.”
				<cite className="mt-3 block font-sans text-[#75879a] text-[9px] not-italic">
					2 Timothy 2:15
				</cite>
			</blockquote>
		</aside>
	);
}
