import { cn } from "@berean-study/ui/lib/utils";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	BookMarkedIcon,
	BookmarkIcon,
	BookOpenIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	FilterIcon,
	LightbulbIcon,
	SearchIcon,
	Share2Icon,
} from "lucide-react";
import { useState } from "react";

type QuestionTopic =
	| "ethics"
	| "faith"
	| "free-will"
	| "god"
	| "gospels"
	| "historical-accuracy"
	| "history"
	| "justice"
	| "reliability"
	| "salvation"
	| "science"
	| "sexuality"
	| "sovereignty"
	| "suffering"
	| "textual-criticism"
	| "violence"
	| "women";

type DetailTab =
	| "overview"
	| "key-passages"
	| "biblical-teaching"
	| "interpretations"
	| "related-questions";

type DifficultQuestion = {
	description: string;
	id: string;
	passage: string;
	tags: readonly QuestionTopic[];
	title: string;
};

const topics = [
	{ id: "all", label: "All" },
	{ id: "god", label: "God" },
	{ id: "suffering", label: "Suffering" },
	{ id: "violence", label: "Violence" },
	{ id: "faith", label: "Faith" },
	{ id: "history", label: "History" },
	{ id: "ethics", label: "Ethics" },
	{ id: "salvation", label: "Salvation" },
	{ id: "women", label: "Women" },
	{ id: "science", label: "Science" },
	{ id: "textual-criticism", label: "Other" },
] as const;

type TopicFilter = (typeof topics)[number]["id"];

const questions: readonly DifficultQuestion[] = [
	{
		description:
			"This is one of the most frequently asked and deeply personal questions in the Bible. It touches on God's character, human suffering, free will, and the problem of evil.",
		id: "why-does-god-allow-suffering",
		passage: "Multiple passages",
		tags: ["suffering", "god"],
		title: "Why does God allow suffering?",
	},
	{
		description:
			"The Old Testament's accounts of judgment call for careful attention to their historical setting, literary context, and the character of God revealed across Scripture.",
		id: "violence-in-the-old-testament",
		passage: "Multiple passages",
		tags: ["violence", "god"],
		title: "How can a loving God command violence in the Old Testament?",
	},
	{
		description:
			"Pharaoh's hardening raises questions about God's sovereignty, human responsibility, and the purpose of divine judgment in Exodus.",
		id: "pharaohs-heart",
		passage: "Exodus 7–14",
		tags: ["sovereignty", "free-will"],
		title: "Why did God harden Pharaoh's heart?",
	},
	{
		description:
			"Textual variants invite an honest look at the manuscript evidence, how translations are made, and what Christians mean when they call Scripture trustworthy.",
		id: "textual-differences",
		passage: "Multiple passages",
		tags: ["textual-criticism", "reliability"],
		title: "How can the Bible be trusted when there are textual differences?",
	},
	{
		description:
			"Scripture's teaching about those who have not heard the gospel holds together God's justice, mercy, and the call to proclaim Christ.",
		id: "never-heard-the-gospel",
		passage: "Romans 2; Acts 17",
		tags: ["salvation", "justice"],
		title: "What happens to those who have never heard the gospel?",
	},
	{
		description:
			"Parallel accounts can differ in their details while offering complementary testimony to the same event and its significance.",
		id: "different-accounts",
		passage: "Matthew 28; Mark 16; Luke 24; John 20",
		tags: ["gospels", "historical-accuracy"],
		title: "Why are there different accounts of the same event?",
	},
	{
		description:
			"Careful Christian reflection begins with Scripture, seeks to understand people with compassion, and acknowledges where faithful believers disagree.",
		id: "lgbtq-relationships",
		passage: "Multiple passages",
		tags: ["sexuality", "ethics"],
		title: "What does the Bible say about LGBTQ+ relationships?",
	},
];

const tagStyles: Record<QuestionTopic, string> = {
	ethics: "bg-[#e4f1e7] text-[#427358]",
	faith: "bg-[#e8eef9] text-[#466482]",
	"free-will": "bg-[#e4f1e7] text-[#427358]",
	god: "bg-[#e3f0fc] text-[#3670a3]",
	gospels: "bg-[#e4f1fb] text-[#3f7196]",
	"historical-accuracy": "bg-[#f4ead3] text-[#7d653b]",
	history: "bg-[#f0ece5] text-[#617081]",
	justice: "bg-[#eee9f7] text-[#64518a]",
	reliability: "bg-[#f5ecd9] text-[#7c6335]",
	salvation: "bg-[#fff0cf] text-[#906d2e]",
	science: "bg-[#e6f0f8] text-[#43708f]",
	sexuality: "bg-[#f8e2e5] text-[#a1545c]",
	sovereignty: "bg-[#ece6f8] text-[#6f568d]",
	suffering: "bg-[#f9e0e0] text-[#a55052]",
	"textual-criticism": "bg-[#e2f0fd] text-[#477ca6]",
	violence: "bg-[#f9e2e1] text-[#a65351]",
	women: "bg-[#ede4f7] text-[#70598c]",
};

const tagLabels: Record<QuestionTopic, string> = {
	ethics: "Ethics",
	faith: "Faith",
	"free-will": "Free will",
	god: "God",
	gospels: "Gospels",
	"historical-accuracy": "Historical accuracy",
	history: "History",
	justice: "Justice",
	reliability: "Reliability",
	salvation: "Salvation",
	science: "Science",
	sexuality: "Sexuality",
	sovereignty: "Sovereignty",
	suffering: "Suffering",
	"textual-criticism": "Textual criticism",
	violence: "Violence",
	women: "Women",
};

const detailTabs = [
	{ id: "overview", label: "Overview" },
	{ id: "key-passages", label: "Key Passages" },
	{ id: "biblical-teaching", label: "Biblical Teaching" },
	{ id: "interpretations", label: "Different Interpretations" },
	{ id: "related-questions", label: "Related Questions" },
] as const satisfies readonly {
	id: DetailTab;
	label: string;
}[];

export function DifficultQuestionsPage() {
	const [activeTopic, setActiveTopic] = useState<TopicFilter>("all");
	const [activeTab, setActiveTab] = useState<DetailTab>("overview");
	const [query, setQuery] = useState("");
	const [selectedQuestionId, setSelectedQuestionId] = useState(questions[0].id);
	const [isSaved, setIsSaved] = useState(false);

	const normalizedQuery = query.trim().toLowerCase();

	const visibleQuestions = questions.filter((question) => {
		const matchesTopic =
			activeTopic === "all" || question.tags.includes(activeTopic);

		const searchableText = [
			question.title,
			question.description,
			question.passage,
			...question.tags.map((tag) => tagLabels[tag]),
		]
			.join(" ")
			.toLowerCase();

		return matchesTopic && searchableText.includes(normalizedQuery);
	});

	const selectedQuestion =
		questions.find((question) => question.id === selectedQuestionId) ??
		questions[0];

	return (
		<main className="min-h-full bg-[#fbfaf7] dark:bg-background">
			<DifficultQuestionsHero />

			<div className="relative z-10 mx-auto -mt-12 w-full max-w-[1500px] px-5 pb-8 lg:px-7 2xl:px-8">
				<div className="grid items-start gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
					<QuestionCatalogue
						activeTopic={activeTopic}
						onQuestionSelect={(questionId) => {
							setSelectedQuestionId(questionId);
							setActiveTab("overview");
						}}
						onQueryChange={setQuery}
						onTopicChange={setActiveTopic}
						query={query}
						selectedQuestionId={selectedQuestion.id}
						visibleQuestions={visibleQuestions}
					/>

					<QuestionDetail
						activeTab={activeTab}
						isSaved={isSaved}
						onSaveToggle={() => setIsSaved((saved) => !saved)}
						onTabChange={setActiveTab}
						question={selectedQuestion}
					/>
				</div>
			</div>
		</main>
	);
}

function DifficultQuestionsHero() {
	return (
		<header className="relative isolate h-[182px] overflow-hidden border-[#e7e2d8] border-b bg-[#f8f4ec] dark:border-border dark:bg-card">
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[position:78%_48%] bg-[url('/landing/cta-hills.png')] bg-cover bg-no-repeat"
			/>

			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[linear-gradient(90deg,#fbfaf7_0%,#fbfaf7_30%,rgba(251,250,247,0.96)_44%,rgba(251,250,247,0.58)_63%,rgba(251,250,247,0.06)_88%)] dark:bg-[linear-gradient(90deg,var(--card)_0%,var(--card)_44%,rgba(0,0,0,0.2)_76%,transparent_100%)]"
			/>

			<div className="relative z-10 mx-auto w-full max-w-[1500px] px-5 pt-5 lg:px-7 2xl:px-8">
				<p className="flex items-center gap-1.5 font-semibold text-[#36577a] text-[11px] uppercase tracking-[0.07em] dark:text-primary">
					<ArrowLeftIcon className="size-3.5" strokeWidth={1.8} />
					Study Tools
				</p>

				<h1 className="mt-2 font-serif text-[#17365e] text-[40px] leading-none tracking-[-0.04em] dark:text-foreground">
					Difficult Questions
				</h1>

				<p className="mt-2.5 max-w-[670px] text-[#476581] text-[14px] leading-[1.5] dark:text-muted-foreground">
					Honest answers to challenging questions about the Bible, with careful
					study of the text, historical context, and different interpretations.
				</p>
			</div>
		</header>
	);
}

function QuestionCatalogue({
	activeTopic,
	onQuestionSelect,
	onQueryChange,
	onTopicChange,
	query,
	selectedQuestionId,
	visibleQuestions,
}: {
	activeTopic: TopicFilter;
	onQuestionSelect: (questionId: string) => void;
	onQueryChange: (query: string) => void;
	onTopicChange: (topic: TopicFilter) => void;
	query: string;
	selectedQuestionId: string;
	visibleQuestions: readonly DifficultQuestion[];
}) {
	const resultLabel =
		activeTopic === "all" && query.trim().length === 0
			? "28 difficult questions"
			: `${visibleQuestions.length} ${
					visibleQuestions.length === 1 ? "question" : "questions"
				}`;

	return (
		<section
			aria-label="Difficult question catalogue"
			className="overflow-hidden rounded-[10px] border border-[#e5e3df] bg-white shadow-[0_4px_16px_rgba(24,50,79,0.055)] dark:border-border dark:bg-card dark:shadow-none"
		>
			<div className="border-[#ece9e3] border-b p-3.5 dark:border-border">
				<div className="flex gap-2">
					<label
						className="relative min-w-0 flex-1"
						htmlFor="difficult-questions-search"
					>
						<span className="sr-only">Search difficult questions</span>

						<SearchIcon
							aria-hidden="true"
							className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#527491]"
							strokeWidth={1.8}
						/>

						<input
							className="h-9 w-full rounded-md border border-[#e2e5e7] bg-white py-2 pr-3 pl-9 text-[#365775] text-[11px] outline-none placeholder:text-[#8494a5] focus:border-[#7c9ab8] focus:ring-2 focus:ring-[#9db6cf]/20 dark:border-border dark:bg-card dark:text-foreground"
							id="difficult-questions-search"
							onChange={(event) => onQueryChange(event.target.value)}
							placeholder="Search difficult questions..."
							type="search"
							value={query}
						/>
					</label>

					<button
						aria-label="Filter difficult questions"
						className="grid size-9 place-items-center rounded-md border border-[#e2e5e7] text-[#496a89] hover:bg-[#f6f9fc] dark:border-border"
						type="button"
					>
						<FilterIcon className="size-4" strokeWidth={1.8} />
					</button>
				</div>

				<div className="mt-2.5 flex flex-wrap gap-1.5">
					{topics.map((topic) => (
						<button
							aria-pressed={activeTopic === topic.id}
							className={cn(
								"h-7 rounded-full border px-3 text-[10px] transition-colors",
								activeTopic === topic.id
									? "border-[#b9d3ed] bg-[#e9f3fd] font-medium text-[#306891]"
									: "border-[#e6e8e9] bg-[#f7f8f9] text-[#5b718b] hover:bg-[#f0f5fa] dark:border-border dark:bg-muted",
							)}
							key={topic.id}
							onClick={() => onTopicChange(topic.id)}
							type="button"
						>
							{topic.label}
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

			{visibleQuestions.length > 0 ? (
				<ul className="divide-y divide-[#edf0f1] dark:divide-border">
					{visibleQuestions.map((question) => {
						const selected = selectedQuestionId === question.id;

						return (
							<li key={question.id}>
								<button
									aria-current={selected ? "true" : undefined}
									className={cn(
										"group flex w-full items-center gap-3 border-l-[3px] px-3.5 py-2.5 text-left transition-colors",
										selected
											? "border-[#c5dff5] bg-[linear-gradient(90deg,#edf6fe_0%,#f9fcff_100%)]"
											: "border-transparent hover:bg-[#f8fafb] dark:hover:bg-muted/50",
									)}
									onClick={() => onQuestionSelect(question.id)}
									type="button"
								>
									<div className="min-w-0 flex-1">
										<h2 className="font-medium text-[#284b6d] text-[11.5px] leading-[1.35] dark:text-foreground">
											{question.title}
										</h2>

										<p className="mt-0.5 text-[#7488a0] text-[9.5px]">
											{question.passage}
										</p>

										<div className="mt-1.5 flex flex-wrap gap-1">
											{question.tags.map((tag) => (
												<span
													className={cn(
														"rounded-full px-2.5 py-0.5 text-[8.5px] leading-4",
														tagStyles[tag],
													)}
													key={tag}
												>
													{tagLabels[tag]}
												</span>
											))}
										</div>
									</div>

									<ChevronRightIcon
										className="size-4 shrink-0 text-[#365a79]"
										strokeWidth={1.7}
									/>
								</button>
							</li>
						);
					})}
				</ul>
			) : (
				<div className="px-5 py-12 text-center">
					<h2 className="font-serif text-[#294562] text-lg dark:text-foreground">
						No difficult questions found
					</h2>

					<p className="mt-1 text-[#71849a] text-xs">
						Try another topic or search term.
					</p>
				</div>
			)}
		</section>
	);
}

function QuestionDetail({
	activeTab,
	isSaved,
	onSaveToggle,
	onTabChange,
	question,
}: {
	activeTab: DetailTab;
	isSaved: boolean;
	onSaveToggle: () => void;
	onTabChange: (tab: DetailTab) => void;
	question: DifficultQuestion;
}) {
	return (
		<article className="overflow-hidden rounded-[10px] border border-[#e5e3df] bg-white shadow-[0_4px_16px_rgba(24,50,79,0.055)] dark:border-border dark:bg-card dark:shadow-none">
			<header className="px-5 pt-4 sm:px-6">
				<div className="flex items-start justify-between gap-6">
					<div className="min-w-0">
						<span
							className={cn(
								"inline-flex rounded-full px-3 py-1 text-[10px]",
								tagStyles[question.tags[0]],
							)}
						>
							{tagLabels[question.tags[0]]}
						</span>

						<h2 className="mt-2 font-serif text-[#17365e] text-[27px] leading-[1.15] tracking-[-0.025em] lg:text-[30px] dark:text-foreground">
							{question.title}
						</h2>

						<p className="mt-2 max-w-[900px] text-[#58718d] text-[12px] leading-[1.55] dark:text-muted-foreground">
							{question.description}
						</p>
					</div>

					<div className="flex shrink-0 gap-2">
						<button
							className="hidden h-9 items-center gap-2 rounded-md border border-[#e2e6e8] px-3 text-[#355b7c] text-[10px] hover:bg-[#f7fafc] sm:inline-flex dark:border-border"
							type="button"
						>
							<Share2Icon className="size-3.5" />
							Share
						</button>

						<button
							aria-label={
								isSaved
									? "Remove difficult question from saved"
									: "Save question"
							}
							aria-pressed={isSaved}
							className={cn(
								"grid size-9 place-items-center rounded-md border text-[#355b7c] hover:bg-[#f7fafc] dark:border-border",
								isSaved ? "border-[#bfd7ed] bg-[#eef7ff]" : "border-[#e2e6e8]",
							)}
							onClick={onSaveToggle}
							type="button"
						>
							{isSaved ? (
								<BookMarkedIcon className="size-4 fill-current" />
							) : (
								<BookmarkIcon className="size-4" />
							)}
						</button>
					</div>
				</div>
			</header>

			<nav
				aria-label="Question detail sections"
				className="mt-4 flex overflow-x-auto border-[#e9edef] border-y px-2 sm:px-3 dark:border-border"
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
			</nav>

			<div className="p-4 sm:p-5">
				{activeTab === "overview" ? (
					<Overview question={question} />
				) : (
					<DetailSection tab={activeTab} />
				)}
			</div>
		</article>
	);
}

function Overview({ question }: { question: DifficultQuestion }) {
	return (
		<div>
			<section className="rounded-[9px] border border-[#dfeaf4] bg-[linear-gradient(110deg,#f0f7fd_0%,#f8fbff_100%)] px-5 py-4 dark:border-border dark:bg-muted/30">
				<h3 className="flex items-center gap-2 font-serif text-[#294b6c] text-[16px] dark:text-foreground">
					<BookMarkedIcon className="size-4.5 text-[#276a9d]" />
					Summary Answer
				</h3>

				<div className="mt-2 space-y-2.5 pl-6 text-[#52708d] text-[11px] leading-[1.55] dark:text-muted-foreground">
					<p>
						The Bible does not give a single, simple answer to the problem of
						suffering. Instead, it presents multiple perspectives that together
						help us understand why suffering exists and how a loving God relates
						to it.
					</p>

					<p>
						Suffering can result from human sin, a broken world, and the reality
						of living in a fallen creation. God sometimes allows suffering for
						purposes such as shaping character, revealing His glory, or bringing
						about greater good. At the same time, the Bible shows that God is
						not distant from our suffering—He enters into it, and He promises a
						future where suffering will be fully removed.
					</p>
				</div>
			</section>

			<div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1.08fr]">
				<KeyPassages />
				<MainThemes />
				<AtAGlance />
			</div>

			<FurtherReading question={question} />
		</div>
	);
}

function KeyPassages() {
	const passages = [
		["Romans 8:18–25", "Suffering in a fallen creation"],
		["Job 1–2", "Righteous suffering"],
		["John 9:1–3", "Suffering and God's purposes"],
	] as const;

	return (
		<section className="flex min-h-[205px] flex-col rounded-[9px] border border-[#e5e7e8] p-4 dark:border-border">
			<h3 className="flex items-center gap-2 font-serif text-[#294b6c] text-[14px] dark:text-foreground">
				<BookOpenIcon className="size-4 text-[#285f8d]" />
				Key Passages
			</h3>

			<ul className="mt-3 space-y-3">
				{passages.map(([passage, detail]) => (
					<li key={passage}>
						<p className="font-medium text-[#326899] text-[10px]">{passage}</p>
						<p className="mt-0.5 text-[#71849a] text-[9px]">{detail}</p>
					</li>
				))}
			</ul>

			<button
				className="mt-auto inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#e1e6e9] text-[#456482] text-[9px] hover:bg-[#f8fafb] dark:border-border"
				type="button"
			>
				View all passages
				<ArrowRightIcon className="size-3" />
			</button>
		</section>
	);
}

function MainThemes() {
	const themes = [
		["Suffering and the fall", "bg-[#f9e0e0] text-[#9d5554]"],
		["God's purposes", "bg-[#e2f0fc] text-[#3c739f]"],
		["Human free will", "bg-[#fff0d2] text-[#906d2f]"],
		["Hope and future restoration", "bg-[#e4f1e7] text-[#477455]"],
		["God's presence in suffering", "bg-[#ece6f8] text-[#6a568c]"],
		["The problem of evil", "bg-[#f6e5dc] text-[#935c48]"],
	] as const;

	return (
		<section className="min-h-[205px] rounded-[9px] border border-[#e5e7e8] p-4 dark:border-border">
			<h3 className="flex items-center gap-2 font-serif text-[#294b6c] text-[14px] dark:text-foreground">
				<LightbulbIcon className="size-4 text-[#285f8d]" />
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
		"Suffering exists in a fallen world.",
		"It can result from human sin, natural brokenness, or other causes.",
		"God can use suffering for good purposes.",
		"The Bible shows God's compassion and presence in suffering.",
		"Christ's suffering gives hope for our own.",
		"A future restoration will remove all suffering.",
	] as const;

	return (
		<section className="min-h-[205px] rounded-[9px] border border-[#e5e7e8] p-4 dark:border-border">
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

function FurtherReading({ question }: { question: DifficultQuestion }) {
	const books = [
		["Suffering and the Sovereignty of God", "John Piper"],
		["Where Is God in a World of Suffering?", "Timothy Keller"],
		["The Problem of Pain", "C.S. Lewis"],
		["Job: A Theological Commentary", "Tremper Longman III"],
	] as const;

	return (
		<section className="mt-4 border-[#e8ecee] border-t pt-3.5 dark:border-border">
			<h3 className="flex items-center gap-2 font-serif text-[#294b6c] text-[14px] dark:text-foreground">
				<BookOpenIcon className="size-4 text-[#285f8d]" />
				Further Reading
			</h3>

			<div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
				{books.map(([title, author], index) => (
					<a
						className="group flex min-w-0 items-center gap-2 rounded-[7px] border border-[#e6e9eb] p-2 hover:border-[#c8d9e8] hover:bg-[#fbfdff] dark:border-border"
						href={`#${question.id}-reading-${index + 1}`}
						key={title}
					>
						<div
							aria-hidden="true"
							className={cn(
								"grid h-12 w-8 shrink-0 place-items-center rounded-[3px] border text-center font-serif text-[6px] text-white shadow-sm",
								index === 0 && "border-[#815b40] bg-[#8d6a4f]",
								index === 1 && "border-[#293f5d] bg-[#1d3653]",
								index === 2 && "border-[#7b6754] bg-[#887463]",
								index === 3 && "border-[#3f5145] bg-[#304a3d]",
							)}
						>
							Book
						</div>

						<div className="min-w-0 flex-1">
							<p className="line-clamp-2 text-[#355876] text-[9px] leading-[1.3] dark:text-foreground">
								{title}
							</p>

							<p className="mt-1 truncate text-[#75879a] text-[8px]">
								{author}
							</p>
						</div>

						<ArrowRightIcon className="size-3.5 shrink-0 text-[#58718a] transition-transform group-hover:translate-x-0.5" />
					</a>
				))}
			</div>
		</section>
	);
}

function DetailSection({ tab }: { tab: Exclude<DetailTab, "overview"> }) {
	const content = {
		"biblical-teaching": {
			heading: "Biblical Teaching",
			text: "The biblical story names the reality of suffering while also showing God's compassion, justice, and promise to renew creation.",
		},
		interpretations: {
			heading: "Different Interpretations",
			text: "Christians have emphasized different biblical themes when answering this question. These approaches can be considered alongside the full witness of Scripture.",
		},
		"key-passages": {
			heading: "Key Passages",
			text: "These passages provide starting points for studying the question in context and tracing how Scripture speaks about it.",
		},
		"related-questions": {
			heading: "Related Questions",
			text: "Explore related questions to see how themes of suffering, evil, justice, and hope connect across Scripture.",
		},
	} satisfies Record<
		Exclude<DetailTab, "overview">,
		{ heading: string; text: string }
	>;

	const section = content[tab];

	return (
		<section className="rounded-[9px] border border-[#e5e9eb] bg-[#fcfdfd] px-6 py-12 text-center dark:border-border dark:bg-muted/30">
			<h3 className="font-serif text-[#294b6c] text-xl dark:text-foreground">
				{section.heading}
			</h3>

			<p className="mx-auto mt-2 max-w-[620px] text-[#627a92] text-sm leading-6 dark:text-muted-foreground">
				{section.text}
			</p>
		</section>
	);
}
