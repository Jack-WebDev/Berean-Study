import { cn } from "@berean-study/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	BookOpenIcon,
	CircleHelpIcon,
	Columns2Icon,
	FileTextIcon,
	LanguagesIcon,
	LightbulbIcon,
	LinkIcon,
	NetworkIcon,
	ShieldQuestionIcon,
} from "lucide-react";

export const Route = createFileRoute("/_auth/study-tools")({
	component: StudyToolsPage,
});

type ToolTone = "blue" | "gold" | "green" | "plum" | "red" | "teal" | "umber";

type StudyTool = {
	description: string;
	icon: LucideIcon;
	id: string;
	label: string;
	tone: ToolTone;
	utility: string;
};

const studyTools = [
	{
		description:
			"Explore major themes in Scripture and see how they develop throughout the Bible.",
		icon: BookOpenIcon,
		id: "themes",
		label: "Themes",
		tone: "gold",
		utility: "Covenant, Kingdom, Grace, ...",
	},
	{
		description:
			"Discover passages that are meaningfully connected, with clear explanations.",
		icon: NetworkIcon,
		id: "cross-references",
		label: "Cross References",
		tone: "green",
		utility: "Related passages and context",
	},
	{
		description:
			"Explore genuine questions with multiple faithful interpretations and supporting evidence.",
		icon: CircleHelpIcon,
		id: "interpretive-questions",
		label: "Interpretive Questions",
		tone: "plum",
		utility: "Compare different viewpoints",
	},
	{
		description:
			"See important observations from the original Hebrew, Aramaic, and Greek texts.",
		icon: LanguagesIcon,
		id: "original-language",
		label: "Original Language",
		tone: "blue",
		utility: "Words, meanings, and context",
	},
	{
		description:
			"Learn about manuscript evidence and places where the biblical text has meaningful uncertainty.",
		icon: FileTextIcon,
		id: "textual-notes",
		label: "Textual Notes",
		tone: "red",
		utility: "Manuscripts, variants, and more",
	},
	{
		description:
			"Examine challenging passages, apparent contradictions, and common objections.",
		icon: ShieldQuestionIcon,
		id: "difficult-questions",
		label: "Difficult Questions",
		tone: "blue",
		utility: "Honest answers with Scripture",
	},
	{
		description:
			"Explore quotations, fulfillments, types, and other connections across Scripture.",
		icon: LinkIcon,
		id: "canonical-connections",
		label: "Canonical Connections",
		tone: "umber",
		utility: "See the bigger picture",
	},
	{
		description:
			"Place two passages side by side to study their similarities, differences, and context.",
		icon: Columns2Icon,
		id: "compare-passages",
		label: "Compare Passages",
		tone: "teal",
		utility: "A clearer understanding",
	},
] as const satisfies readonly StudyTool[];

const toneClasses: Record<ToolTone, string> = {
	blue: "bg-[#4f99b7]",
	gold: "bg-[#dda93d]",
	green: "bg-[#58946f]",
	plum: "bg-[#9169b8]",
	red: "bg-[#bd5a4b]",
	teal: "bg-[#377f81]",
	umber: "bg-[#936d49]",
};

function StudyToolsPage() {
	return (
		<main className="min-h-full bg-[#faf9f5] dark:bg-background">
			<StudyToolsHero />

			<div className="px-5 pt-4 pb-5 lg:px-5">
				<section aria-labelledby="study-tools-heading">
					<h2 className="sr-only" id="study-tools-heading">
						Study tools
					</h2>

					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{studyTools.map((tool) => (
							<StudyToolCard key={tool.id} tool={tool} />
						))}
					</div>
				</section>

				<InterpretationNote />
			</div>
		</main>
	);
}

function StudyToolsHero() {
	return (
		<header
			className="relative isolate min-h-[305px] overflow-hidden border-[#e7e2d8] border-b bg-[#f8f4ec] dark:border-border dark:bg-card"
			id="overview"
		>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[position:62%_52%] bg-[url('/study-tools-overview-bg.png')] bg-cover bg-no-repeat"
			/>

			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[linear-gradient(90deg,#fbfaf6_0%,#fbfaf6_30%,rgba(251,250,246,0.97)_39%,rgba(251,250,246,0.78)_51%,rgba(251,250,246,0.22)_67%,rgba(251,250,246,0)_82%)] dark:bg-[linear-gradient(90deg,var(--card)_0%,var(--card)_38%,rgba(0,0,0,0.28)_70%,transparent_88%)]"
			/>

			<div className="relative z-10 w-full max-w-150 px-6 py-8 sm:px-10 lg:px-[76px] lg:py-[32px]">
				<p className="font-semibold text-[#29435e] text-[11px] uppercase tracking-[0.09em] dark:text-primary">
					Study Tools
				</p>

				<h1 className="mt-2 font-serif text-[#18324f] text-[38px] leading-[1.06] tracking-[-0.035em] sm:text-[40px] dark:text-foreground">
					Explore Scripture More Deeply
				</h1>

				<p className="mt-3 max-w-[430px] text-[#405873] text-[14px] leading-[1.55] dark:text-muted-foreground">
					Use these tools to investigate the Bible, explore key themes, compare
					perspectives, and engage with challenging questions.
				</p>

				<blockquote className="mt-4 w-full max-w-[382px] rounded-[8px] border border-[#dfd9cf] bg-white/82 px-4 py-3 text-[#294562] shadow-[0_2px_5px_rgba(34,50,68,0.04)] backdrop-blur-[2px] dark:border-border dark:bg-card/85 dark:text-muted-foreground">
					<p className="text-[12px] leading-5">
						“Search the Scriptures daily to see if these things are so.”
					</p>

					<cite className="mt-0.5 block text-[#73859a] text-[11px] not-italic">
						— Acts 17:11
					</cite>
				</blockquote>
			</div>
		</header>
	);
}

function StudyToolCard({ tool }: { tool: StudyTool }) {
	const Icon = tool.icon;

	return (
		<article
			className="group flex min-h-[194px] flex-col rounded-[8px] border border-[#e8e5df] bg-white px-4 py-3.5 shadow-[0_3px_10px_rgba(24,50,79,0.055)] transition-shadow hover:shadow-[0_6px_18px_rgba(24,50,79,0.09)] dark:border-border dark:bg-card dark:shadow-none"
			id={tool.id}
		>
			<div
				className={cn(
					"flex size-[42px] shrink-0 items-center justify-center rounded-[7px] text-white shadow-sm",
					toneClasses[tool.tone],
				)}
			>
				<Icon aria-hidden="true" className="size-[21px]" strokeWidth={1.8} />
			</div>

			<h3 className="mt-2 font-serif text-[#18324f] text-[17px] leading-[1.15] tracking-[-0.02em] dark:text-foreground">
				{tool.label}
			</h3>

			<p className="mt-1 text-[#667b96] text-[13px] leading-[1.48] dark:text-muted-foreground">
				{tool.description}
			</p>

			<div className="mt-auto flex items-end justify-between gap-3 pt-3">
				<span className="line-clamp-1 text-[#456b91] text-[11.5px] dark:text-primary">
					{tool.utility}
				</span>

				<span
					aria-hidden="true"
					className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f0efeb] text-[#52687e] transition-transform group-hover:translate-x-0.5 dark:bg-muted dark:text-muted-foreground"
				>
					<ArrowRightIcon className="size-3.5" strokeWidth={1.8} />
				</span>
			</div>
		</article>
	);
}

function InterpretationNote() {
	return (
		<aside className="mt-4 flex min-h-[61px] items-start gap-3 rounded-[8px] border border-[#e5e1d9] bg-white/65 px-5 py-3 shadow-[0_2px_7px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70">
			<LightbulbIcon
				aria-hidden="true"
				className="mt-0.5 size-[19px] shrink-0 text-[#d3a12f]"
				strokeWidth={1.8}
			/>

			<div>
				<h2 className="font-medium text-[#294562] text-[11.5px] leading-4 dark:text-foreground">
					A Note on Interpretation
				</h2>

				<p className="mt-0.5 text-[#71839a] text-[11px] leading-[1.55] dark:text-muted-foreground">
					Berean Study is committed to careful, faithful, and transparent study
					of Scripture. These tools are here to help you explore, not to replace
					your own study and discernment.
				</p>
			</div>
		</aside>
	);
}
