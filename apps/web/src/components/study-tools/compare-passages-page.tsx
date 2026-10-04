import { cn } from "@berean-study/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	ArrowLeftIcon,
	BookOpenIcon,
	ChevronDownIcon,
	CopyIcon,
	ExternalLinkIcon,
	Grid2X2Icon,
	LinkIcon,
	ListIcon,
	MessageCircleIcon,
	PlusIcon,
	Share2Icon,
	SpeakerIcon,
	TagsIcon,
	Trash2Icon,
	Volume2Icon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

type Passage = {
	id: string;
	label: string;
	reference: string;
	verses: readonly Verse[];
};

type Verse = {
	content: ReactNode;
	number: string;
};

type ThemeTone = "blue" | "gold" | "green" | "plum" | "red" | "teal";

const initialPassages: readonly Passage[] = [
	{
		id: "ephesians-2",
		label: "Passage 1",
		reference: "Ephesians 2:8–9",
		verses: [
			{
				number: "8",
				content: (
					<>
						For by <Mark tone="blue">grace</Mark> you have been{" "}
						<Mark tone="gold">saved</Mark> through{" "}
						<Mark tone="green">faith</Mark>. And this is not your own doing; it
						is the <Mark tone="plum">gift of God</Mark>,
					</>
				),
			},
			{
				number: "9",
				content: <>not a result of works, so that no one may boast.</>,
			},
		],
	},
	{
		id: "titus-3",
		label: "Passage 2",
		reference: "Titus 3:4–7",
		verses: [
			{
				number: "4",
				content: (
					<>
						But when the goodness and loving kindness of God our Savior
						appeared,
					</>
				),
			},
			{
				number: "5",
				content: (
					<>
						he <Mark tone="gold">saved</Mark> us, not because of works done by
						us in righteousness, but according to his own{" "}
						<Mark tone="plum">mercy</Mark>, by the washing of regeneration and
						renewal of the Holy Spirit,
					</>
				),
			},
			{
				number: "6",
				content: (
					<>whom he poured out on us richly through Jesus Christ our Savior,</>
				),
			},
			{
				number: "7",
				content: (
					<>
						so that being justified by his <Mark tone="blue">grace</Mark> we
						might become heirs according to the hope of eternal life.
					</>
				),
			},
		],
	},
];

const passageSlots = [
	{ index: 0, passage: initialPassages[0] },
	{ index: 1, passage: initialPassages[1] },
] as const;

const themes = [
	{ label: "Grace", tone: "blue" },
	{ label: "Salvation", tone: "gold" },
	{ label: "Faith", tone: "green" },
	{ label: "Not by works", tone: "red" },
	{ label: "Mercy", tone: "plum" },
	{ label: "New life", tone: "teal" },
] as const satisfies readonly { label: string; tone: ThemeTone }[];

const themeClasses: Record<ThemeTone, string> = {
	blue: "bg-[#e3f0fb] text-[#3d6f98]",
	gold: "bg-[#fff0cf] text-[#8c6927]",
	green: "bg-[#e0f0e3] text-[#427955]",
	plum: "bg-[#eee7f8] text-[#6e5795]",
	red: "bg-[#f9e1df] text-[#a1514d]",
	teal: "bg-[#dcf0ef] text-[#377778]",
};

const comparisonNotes = [
	{
		id: "ephesians-notes",
		items: [
			"Salvation is by grace through faith.",
			"It is a gift from God, not earned by works.",
			"The result is that no one can boast.",
		],
		title: "Ephesians 2:8–9",
	},
	{
		id: "titus-notes",
		items: [
			"God's kindness and mercy led to our salvation.",
			"Salvation is not because of works, but according to His mercy.",
			"It brings new life through the Holy Spirit.",
			"We are justified by His grace and become heirs of eternal life.",
		],
		title: "Titus 3:4–7",
	},
] as const;

const references = [
	{
		description: "Justified by grace",
		id: "romans-3",
		title: "Romans 3:23–24",
	},
	{
		description: "Not by works of the law",
		id: "galatians-2",
		title: "Galatians 2:16",
	},
	{ description: "Eternal life", id: "romans-6", title: "Romans 6:23" },
	{ description: "Saved by grace", id: "timothy-1", title: "2 Timothy 1:9" },
	{ description: "Gift of God", id: "john-3", title: "John 3:16" },
	{ description: "By grace", id: "romans-11", title: "Romans 11:6" },
] as const;

export function ComparePassagesPage() {
	const [passageReferences, setPassageReferences] = useState<[string, string]>([
		initialPassages[0].reference,
		initialPassages[1].reference,
	]);
	const [isShared, setIsShared] = useState(false);

	function updatePassageReference(index: 0 | 1, reference: string) {
		setPassageReferences((current) => {
			const next: [string, string] = [...current];
			next[index] = reference;
			return next;
		});
	}

	function swapPassages() {
		setPassageReferences(([first, second]) => [second, first]);
	}

	return (
		<main className="min-h-full bg-[#fbfaf7] pb-8 dark:bg-background">
			<div className="mx-auto w-full max-w-[1320px] px-5 py-5 lg:px-7 lg:py-6">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<p className="flex items-center gap-1 font-semibold text-[#54708c] text-[10px] tracking-[0.04em] dark:text-primary">
							<ArrowLeftIcon
								aria-hidden="true"
								className="size-3"
								strokeWidth={2}
							/>
							Study Tools
						</p>
						<h1 className="mt-1 font-serif text-[#17365e] text-[33px] leading-none tracking-[-0.035em] sm:text-[38px] dark:text-foreground">
							Compare Passages
						</h1>
						<p className="mt-1.5 text-[#526b85] text-[13px] leading-5 dark:text-muted-foreground">
							Place two passages side by side to study their similarities,
							differences, and context.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2 lg:pt-0.5">
						<ToolbarButton
							icon={ArrowLeftIcon}
							label="Swap"
							onClick={swapPassages}
						/>
						<ToolbarButton icon={PlusIcon} label="Add a passage" />
						<ToolbarButton
							icon={Share2Icon}
							label={isShared ? "Link copied" : "Share"}
							onClick={() => setIsShared(true)}
						/>
					</div>
				</header>

				<div className="mt-5 grid gap-4 xl:grid-cols-[144px_minmax(0,1fr)]">
					<ComparisonNavigation />
					<div className="min-w-0">
						<div className="grid gap-3 md:grid-cols-2">
							{passageSlots.map(({ index, passage }) => (
								<PassagePicker
									key={passage.id}
									label={passage.label}
									onChange={(reference) =>
										updatePassageReference(index, reference)
									}
									reference={passageReferences[index]}
								/>
							))}
						</div>

						<div className="mt-3 grid gap-3 md:grid-cols-2">
							{passageSlots.map(({ index, passage }) => (
								<PassageCard
									key={passage.id}
									passage={passage}
									reference={passageReferences[index]}
								/>
							))}
						</div>

						<ComparisonInsights />
					</div>
				</div>
			</div>
		</main>
	);
}

function ToolbarButton({
	icon: Icon,
	label,
	onClick,
}: {
	icon: LucideIcon;
	label: string;
	onClick?: () => void;
}) {
	return (
		<button
			className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e5e5e2] bg-white px-2.5 font-medium text-[#35536f] text-[11px] shadow-[0_1px_3px_rgba(24,50,79,0.035)] transition-colors hover:bg-[#f8fafb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#91adc6] dark:border-border dark:bg-card dark:text-foreground"
			onClick={onClick}
			type="button"
		>
			<Icon aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
			{label}
		</button>
	);
}

function ComparisonNavigation() {
	const items = [
		{ icon: Grid2X2Icon, label: "Overview" },
		{ icon: TagsIcon, label: "Key Themes" },
		{ icon: LinkIcon, label: "Cross References" },
		{ icon: SpeakerIcon, label: "Original Language" },
		{ icon: BookOpenIcon, label: "Interpretations" },
		{ icon: ListIcon, label: "Related Passages" },
		{ icon: MessageCircleIcon, label: "Notes & Commentary" },
	] as const;

	return (
		<nav aria-label="Comparison sections" className="hidden xl:block">
			<ul className="space-y-1">
				{items.map((item, index) => {
					const Icon = item.icon;
					return (
						<li key={item.label}>
							<button
								aria-current={index === 0 ? "page" : undefined}
								className={cn(
									"flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left font-medium text-[#415d77] text-[11px] hover:bg-[#f5f1e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#91adc6] dark:text-muted-foreground",
									index === 0 &&
										"bg-[#f4ede0] text-[#25435d] dark:bg-muted dark:text-foreground",
								)}
								type="button"
							>
								<Icon
									aria-hidden="true"
									className="size-3.5 shrink-0"
									strokeWidth={1.9}
								/>
								{item.label}
							</button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

function PassagePicker({
	label,
	onChange,
	reference,
}: {
	label: string;
	onChange: (reference: string) => void;
	reference: string;
}) {
	return (
		<section className="rounded-[9px] border border-[#e8e6e2] bg-white p-3 shadow-[0_3px_10px_rgba(24,50,79,0.035)] dark:border-border dark:bg-card dark:shadow-none">
			<label
				className="block font-semibold text-[#28455f] text-[10px] dark:text-foreground"
				htmlFor={`passage-${label}`}
			>
				{label}
			</label>
			<div className="relative mt-1.5">
				<input
					className="h-8 w-full rounded-md border border-[#e1e5e8] bg-white px-2.5 pr-8 text-[#29465f] text-[13px] shadow-[inset_0_1px_2px_rgba(24,50,79,0.02)] outline-none placeholder:text-[#8190a0] focus:border-[#8da5bb] focus:ring-2 focus:ring-[#9fb4c8]/25 dark:border-border dark:bg-card dark:text-foreground"
					id={`passage-${label}`}
					onChange={(event) => onChange(event.target.value)}
					value={reference}
				/>
				<button
					aria-label={`Clear ${label}`}
					className="absolute top-1/2 right-2 -translate-y-1/2 text-[#8594a3] hover:text-[#4b6176]"
					onClick={() => onChange("")}
					type="button"
				>
					<Trash2Icon
						aria-hidden="true"
						className="size-3.5"
						strokeWidth={1.6}
					/>
				</button>
			</div>
			<label
				className="relative mt-1.5 flex h-8 items-center rounded-md border border-[#e1e5e8] bg-white px-2.5 text-[#3e5871] text-[11px] dark:border-border dark:bg-card dark:text-foreground"
				htmlFor={`translation-${label}`}
			>
				<BookOpenIcon
					aria-hidden="true"
					className="mr-2 size-3.5 text-[#274966]"
					fill="currentColor"
					strokeWidth={1.4}
				/>
				<span className="truncate">English Standard Version (ESV)</span>
				<ChevronDownIcon
					aria-hidden="true"
					className="ml-auto size-3.5"
					strokeWidth={1.8}
				/>
				<select
					className="sr-only"
					defaultValue="esv"
					id={`translation-${label}`}
				>
					<option value="esv">English Standard Version (ESV)</option>
				</select>
			</label>
		</section>
	);
}

function PassageCard({
	passage,
	reference,
}: {
	passage: Passage;
	reference: string;
}) {
	return (
		<section className="min-h-[260px] rounded-[9px] border border-[#ebe9e5] bg-white p-3 shadow-[0_4px_13px_rgba(24,50,79,0.04)] dark:border-border dark:bg-card dark:shadow-none">
			<div className="flex items-start justify-between gap-3">
				<h2 className="font-bold font-serif text-[#193958] text-[18px] leading-7 tracking-[-0.025em] dark:text-foreground">
					{reference || passage.reference}
				</h2>
				<div className="flex shrink-0 items-center gap-1">
					<button
						aria-label={`Translation for ${passage.label}`}
						className="inline-flex h-8 items-center gap-1 rounded-md border border-[#e7e8e8] px-2 text-[#38546d] text-[11px] dark:border-border"
						type="button"
					>
						ESV <ChevronDownIcon aria-hidden="true" className="size-3" />
					</button>
					<PassageAction
						icon={Volume2Icon}
						label={`Listen to ${passage.reference}`}
					/>
					<PassageAction icon={CopyIcon} label={`Copy ${passage.reference}`} />
					<PassageAction
						icon={ExternalLinkIcon}
						label={`Open ${passage.reference}`}
					/>
				</div>
			</div>
			<div className="mt-4 space-y-1.5">
				{passage.verses.map((verse) => (
					<p
						className="grid grid-cols-[16px_minmax(0,1fr)] gap-2 text-[#3b526a] text-[12.5px] leading-[1.65] dark:text-muted-foreground"
						key={verse.number}
					>
						<span className="font-semibold text-[#788a9c] text-[11px]">
							{verse.number}
						</span>
						<span>{verse.content}</span>
					</p>
				))}
			</div>
		</section>
	);
}

function PassageAction({
	icon: Icon,
	label,
}: {
	icon: LucideIcon;
	label: string;
}) {
	return (
		<button
			aria-label={label}
			className="grid size-8 place-items-center rounded-md border border-[#e7e8e8] text-[#405b73] hover:bg-[#f7fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#91adc6] dark:border-border dark:text-foreground"
			type="button"
		>
			<Icon aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
		</button>
	);
}

function Mark({ children, tone }: { children: ReactNode; tone: ThemeTone }) {
	return (
		<mark className={cn("rounded-sm px-0.5", themeClasses[tone])}>
			{children}
		</mark>
	);
}

function ComparisonInsights() {
	return (
		<section className="mt-3 rounded-[9px] border border-[#ebe9e5] bg-white p-3.5 shadow-[0_4px_13px_rgba(24,50,79,0.035)] dark:border-border dark:bg-card dark:shadow-none">
			<div className="flex items-center gap-2">
				<TagsIcon
					aria-hidden="true"
					className="size-4 text-[#264966]"
					strokeWidth={1.9}
				/>
				<h2 className="font-bold font-serif text-[#193958] text-[17px] tracking-[-0.02em] dark:text-foreground">
					Key Themes
				</h2>
			</div>
			<div className="mt-2 flex flex-wrap gap-1.5">
				{themes.map((theme) => (
					<span
						className={cn(
							"rounded-full px-3 py-1 font-medium text-[10px]",
							themeClasses[theme.tone],
						)}
						key={theme.label}
					>
						{theme.label}
					</span>
				))}
			</div>
			<div className="mt-3 grid gap-3 md:grid-cols-2">
				{comparisonNotes.map((note) => (
					<article
						className="rounded-lg border border-[#e9e9e6] px-3 py-2.5"
						key={note.id}
					>
						<h3 className="font-semibold text-[#294660] text-[12px] dark:text-foreground">
							{note.title}
						</h3>
						<ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[#61758b] text-[10.5px] leading-[1.5] dark:text-muted-foreground">
							{note.items.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</article>
				))}
			</div>
			<div className="mt-3 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<LinkIcon
						aria-hidden="true"
						className="size-4 text-[#264966]"
						strokeWidth={1.9}
					/>
					<h2 className="font-bold font-serif text-[#193958] text-[17px] tracking-[-0.02em] dark:text-foreground">
						Cross References
					</h2>
				</div>
				<button
					className="inline-flex h-7 items-center gap-1 rounded-md border border-[#e5e7e8] px-2 text-[#456078] text-[10px] hover:bg-[#f8fafb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#91adc6] dark:border-border dark:text-foreground"
					type="button"
				>
					View all <ExternalLinkIcon aria-hidden="true" className="size-3" />
				</button>
			</div>
			<div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				{references.map((reference) => (
					<button
						className="min-w-0 rounded-md border border-[#e9e9e6] px-2.5 py-1.5 text-left hover:bg-[#fafbf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#91adc6] dark:border-border"
						key={reference.id}
						type="button"
					>
						<span className="block truncate font-medium text-[#4772a2] text-[10px]">
							{reference.title}
						</span>
						<span className="block truncate text-[#7a8998] text-[9px] dark:text-muted-foreground">
							{reference.description}
						</span>
					</button>
				))}
			</div>
		</section>
	);
}
