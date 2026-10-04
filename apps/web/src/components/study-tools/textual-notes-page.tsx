import { cn } from "@berean-study/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	BookOpenIcon,
	CircleHelpIcon,
	CrossIcon,
	FileTextIcon,
	LightbulbIcon,
	SearchIcon,
	StarIcon,
	TextIcon,
} from "lucide-react";
import { useState } from "react";

type NoteFilter =
	| "added-passages"
	| "all"
	| "gospel-passages"
	| "important-notes"
	| "longer-endings"
	| "pauline-letters"
	| "variants";

type NoteTone = "blue" | "gold" | "green" | "plum" | "red";

type TextualNote = {
	categories: readonly Exclude<NoteFilter, "all">[];
	description: string;
	id: string;
	passage: string;
	title: string;
	tone: NoteTone;
	subtitle: string;
};

const filters = [
	{ label: "All", value: "all" },
	{ label: "Gospel Passages", value: "gospel-passages" },
	{ label: "Pauline Letters", value: "pauline-letters" },
	{ label: "Variants", value: "variants" },
	{ label: "Longer Endings", value: "longer-endings" },
	{ label: "Added Passages", value: "added-passages" },
	{ label: "Important Notes", value: "important-notes" },
] as const satisfies readonly { label: string; value: NoteFilter }[];

const noteTypes = [
	{
		description:
			"Significant differences that affect meaning, wording, or interpretation.",
		icon: TextIcon,
		id: "major-variants",
		labels: ["John 1:18", "1 John 5:7–8"],
		title: "Major Variants",
		tone: "plum",
	},
	{
		description:
			"Passages that appear in some manuscripts but are absent in others.",
		icon: FileTextIcon,
		id: "added-omitted",
		labels: ["Mark 16:9–20", "John 7:53–8:11"],
		title: "Added or Omitted Passages",
		tone: "green",
	},
	{
		description: "Notable variations in the endings of the Gospels.",
		icon: BookOpenIcon,
		id: "gospel-endings",
		labels: ["Mark 16:9–20", "John 21:24–25"],
		title: "Gospel Endings",
		tone: "blue",
	},
	{
		description: "Readings that relate to the person and nature of Christ.",
		icon: CrossIcon,
		id: "christological-variants",
		labels: ["John 1:18", "Hebrews 2:9"],
		title: "Christological Variants",
		tone: "red",
	},
	{
		description:
			"Challenging or unusual wording that requires careful consideration.",
		icon: CircleHelpIcon,
		id: "difficult-readings",
		labels: ["Romans 5:1", "1 Timothy 3:16"],
		title: "Difficult Readings",
		tone: "gold",
	},
] as const satisfies readonly {
	description: string;
	icon: LucideIcon;
	id: string;
	labels: readonly string[];
	title: string;
	tone: NoteTone;
}[];

const notes = [
	{
		categories: ["gospel-passages", "longer-endings", "important-notes"],
		description:
			"Verses 9–20 are absent from the earliest manuscripts but present in later copies. This passage includes post-resurrection appearances and commissioning language.",
		id: "mark-longer-ending",
		passage: "Mark 16:9–20",
		subtitle: "The Longer Ending of Mark",
		title: "Mark 16:9–20",
		tone: "plum",
	},
	{
		categories: ["added-passages", "gospel-passages", "important-notes"],
		description:
			"This well-known passage is not found in the earliest manuscripts. It appears in later manuscript traditions and different locations.",
		id: "woman-caught-adultery",
		passage: "John 7:53–8:11",
		subtitle: "The Woman Caught in Adultery",
		title: "John 7:53–8:11",
		tone: "green",
	},
	{
		categories: ["added-passages", "pauline-letters", "variants"],
		description:
			"A longer reading that explicitly mentions the ‘Father, Word, and Holy Spirit’ is found in later manuscripts but absent from the earliest Greek witnesses.",
		id: "comma-johanneum",
		passage: "1 John 5:7–8",
		subtitle: "The Comma Johanneum",
		title: "1 John 5:7–8",
		tone: "red",
	},
	{
		categories: ["pauline-letters", "variants", "important-notes"],
		description:
			"Some early manuscripts omit Romans 5:1, while others begin the text at 5:2. This does not affect major doctrinal teaching but is a notable textual variation.",
		id: "romans-five-one",
		passage: "Romans 5:1",
		subtitle: "The Absence or Presence of 5:1",
		title: "Romans 5:1",
		tone: "blue",
	},
	{
		categories: ["important-notes", "variants"],
		description:
			"Some manuscripts read ‘for a little while’ while others read ‘for the suffering of death,’ a variation that affects how the verse is understood.",
		id: "hebrews-two-nine",
		passage: "Hebrews 2:9",
		subtitle: "“For a Little While”",
		title: "Hebrews 2:9",
		tone: "blue",
	},
] as const satisfies readonly TextualNote[];

const toneClasses: Record<NoteTone, string> = {
	blue: "bg-[#287fb1]",
	gold: "bg-[#b8831d]",
	green: "bg-[#2f8061]",
	plum: "bg-[#824db4]",
	red: "bg-[#ba4439]",
};

const cardBackgrounds: Record<NoteTone, string> = {
	blue: "bg-[#edf5fb]",
	gold: "bg-[#fcf5e6]",
	green: "bg-[#edf6ef]",
	plum: "bg-[#f4eefb]",
	red: "bg-[#fbeced]",
};

const guideIconClasses: Record<NoteTone, string> = {
	blue: "text-[#287fb1]",
	gold: "text-[#b8831d]",
	green: "text-[#2f8061]",
	plum: "text-[#824db4]",
	red: "text-[#ba4439]",
};

export function TextualNotesPage() {
	const [filter, setFilter] = useState<NoteFilter>("all");
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const visibleNotes = notes.filter((note) => {
		const matchesFilter =
			filter === "all" ||
			note.categories.some((category) => category === filter);
		const searchableText = [
			note.title,
			note.subtitle,
			note.description,
			note.passage,
			...note.categories.map((category) => category.replaceAll("-", " ")),
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
						<TextualNotesHeader
							filter={filter}
							onFilterChange={setFilter}
							onQueryChange={setQuery}
							query={query}
						/>
						<FeaturedTextualNote />
						<NoteTypes />
						<FeaturedTextualNotes notes={visibleNotes} onReset={resetFilters} />
					</div>
					<TextualNotesGuide />
				</div>
			</div>
		</main>
	);
}

function TextualNotesHeader({
	filter,
	onFilterChange,
	onQueryChange,
	query,
}: {
	filter: NoteFilter;
	onFilterChange: (filter: NoteFilter) => void;
	onQueryChange: (query: string) => void;
	query: string;
}) {
	return (
		<header>
			<p className="font-semibold text-[#36577a] text-[10px] uppercase tracking-[0.06em] dark:text-primary">
				Study Tools
			</p>
			<h1 className="mt-2 font-serif text-[#17365e] text-[42px] leading-none tracking-[-0.035em] dark:text-foreground">
				Textual Notes
			</h1>
			<p className="mt-4 max-w-[790px] text-[#405f80] text-[15px] leading-[1.6] dark:text-muted-foreground">
				Explore meaningful manuscript differences and textual issues in
				Scripture. Learn how these variations inform translation,
				interpretation, and our understanding of God&apos;s Word.
			</p>
			<div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
				<label
					className="relative min-w-0 flex-1"
					htmlFor="textual-notes-search"
				>
					<span className="sr-only">Search textual notes</span>
					<SearchIcon
						aria-hidden="true"
						className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#507294]"
						strokeWidth={1.8}
					/>
					<input
						className="h-9 w-full rounded-lg border border-[#e6e2db] bg-white py-2 pr-3 pl-10 text-[#355675] text-[11px] shadow-[0_1px_3px_rgba(24,50,79,0.05)] outline-none placeholder:text-[#8293a6] focus:border-[#c79c58] focus:ring-2 focus:ring-[#d8c79e]/25 dark:border-border dark:bg-card dark:text-foreground"
						id="textual-notes-search"
						onChange={(event) => onQueryChange(event.target.value)}
						placeholder="Search textual notes, passages, or topics..."
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

function FeaturedTextualNote() {
	return (
		<section className="relative mt-4 min-h-[238px] overflow-hidden rounded-lg border border-[#e4dfd5] bg-[#f8f4ec] shadow-[0_2px_7px_rgba(24,50,79,0.05)]">
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[position:65%_center] bg-[url('/landing/cta-hills.png')] bg-cover bg-no-repeat"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[linear-gradient(90deg,#fcfbf7_0%,#fcfbf7_28%,rgba(252,251,247,0.97)_40%,rgba(252,251,247,0.69)_56%,rgba(252,251,247,0.12)_82%,transparent_100%)] dark:bg-[linear-gradient(90deg,var(--card)_0%,var(--card)_44%,rgba(0,0,0,0.2)_73%,transparent_100%)]"
			/>
			<div className="relative z-10 max-w-[600px] px-7 py-5 sm:px-9 sm:py-6">
				<p className="flex items-center gap-1.5 font-semibold text-[#a4742f] text-[10px] uppercase tracking-[0.04em]">
					<StarIcon aria-hidden="true" className="size-3 fill-current" />
					Featured Textual Note
				</p>
				<h2 className="mt-2 font-serif text-[#17365e] text-[31px] leading-none tracking-[-0.03em] dark:text-foreground">
					John 1:18
				</h2>
				<p className="mt-2 max-w-[545px] text-[#58708a] text-[12px] leading-[1.55] dark:text-muted-foreground">
					John 1:18 contains a recognized textual variation between “only God” (
					<i>theos monogenēs</i>) and “only Son” (<i>huios monogenēs</i>). This
					difference involves a single Greek word (<i>theos</i> or <i>huios</i>)
					and is important because it relates to how the verse speaks about the
					identity of the Son and his relationship to the Father.
				</p>
				<div className="mt-3 flex flex-wrap gap-2">
					{[
						"John 1:18",
						"Greek Witnesses",
						"Christology",
						"Important Variant",
					].map((label) => (
						<span
							className="rounded-md border border-[#dce2e4] bg-white/72 px-2 py-1 text-[#496b89] text-[9px] shadow-sm backdrop-blur-sm"
							key={label}
						>
							{label}
						</span>
					))}
				</div>
				<div className="mt-3 flex flex-wrap gap-3">
					<button
						className="inline-flex h-9 items-center gap-2 rounded-md bg-[#b78332] px-5 font-medium text-[11px] text-white shadow-sm transition-colors hover:bg-[#a57429]"
						type="button"
					>
						Explore note
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

function NoteTypes() {
	return (
		<section aria-labelledby="note-types-heading" className="mt-4">
			<div className="flex items-start gap-3">
				<BookOpenIcon
					aria-hidden="true"
					className="mt-0.5 size-6 shrink-0 text-[#173d67]"
					strokeWidth={1.7}
				/>
				<div>
					<h2
						className="font-serif text-[#17365e] text-[20px] leading-6 dark:text-foreground"
						id="note-types-heading"
					>
						Explore by Note Type
					</h2>
					<p className="mt-0.5 text-[#68809b] text-[10px] leading-[1.5] dark:text-muted-foreground">
						Choose a category to see different kinds of textual notes and
						examples from Scripture.
					</p>
				</div>
			</div>
			<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				{noteTypes.map((noteType) => (
					<NoteTypeCard key={noteType.id} noteType={noteType} />
				))}
			</div>
		</section>
	);
}

function NoteTypeCard({ noteType }: { noteType: (typeof noteTypes)[number] }) {
	const Icon = noteType.icon;
	return (
		<article className="flex min-h-[126px] flex-col rounded-lg border border-[#ebe8e2] bg-white p-3 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card">
			<div className="flex gap-3">
				<div
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-md text-white shadow-sm",
						toneClasses[noteType.tone],
					)}
				>
					<Icon aria-hidden="true" className="size-4" strokeWidth={2} />
				</div>
				<div className="min-w-0">
					<h3 className="font-serif text-[#284767] text-[12px] leading-4 dark:text-foreground">
						{noteType.title}
					</h3>
					<p className="mt-1 text-[#71849a] text-[9px] leading-[1.4] dark:text-muted-foreground">
						{noteType.description}
					</p>
				</div>
			</div>
			<div className="mt-auto flex items-center justify-between gap-2 pt-3">
				<div className="flex min-w-0 flex-wrap gap-1">
					{noteType.labels.map((label) => (
						<span
							className="truncate rounded bg-[#f0f3f5] px-1.5 py-1 text-[#607891] text-[8px]"
							key={label}
						>
							{label}
						</span>
					))}
				</div>
				<ArrowRightIcon
					aria-hidden="true"
					className="size-3 shrink-0 text-[#60748a]"
				/>
			</div>
		</article>
	);
}

function FeaturedTextualNotes({
	notes,
	onReset,
}: {
	notes: readonly TextualNote[];
	onReset: () => void;
}) {
	return (
		<section aria-labelledby="featured-notes-heading" className="mt-4">
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
							id="featured-notes-heading"
						>
							Featured Textual Notes
						</h2>
						<p className="mt-0.5 text-[#68809b] text-[10px] leading-[1.5] dark:text-muted-foreground">
							Explore well-known passages with meaningful manuscript variations
							and learn how they inform our understanding of Scripture.
						</p>
					</div>
				</div>
				<button
					className="hidden h-8 shrink-0 items-center gap-2 rounded-md border border-[#e3e4e1] bg-white px-3 text-[#426588] text-[10px] shadow-sm hover:bg-[#faf9f5] sm:inline-flex"
					onClick={onReset}
					type="button"
				>
					View all textual notes
					<ArrowRightIcon aria-hidden="true" className="size-3" />
				</button>
			</div>
			{notes.length > 0 ? (
				<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
					{notes.map((note) => (
						<TextualNoteCard key={note.id} note={note} />
					))}
				</div>
			) : (
				<div className="mt-3 rounded-lg border border-[#dbd8d1] border-dashed bg-white/65 px-5 py-9 text-center dark:border-border dark:bg-card/70">
					<h3 className="font-serif text-[#294562] text-lg dark:text-foreground">
						No textual notes found
					</h3>
					<p className="mt-1 text-[#71839a] text-sm dark:text-muted-foreground">
						Try a different search or clear the selected filter.
					</p>
					<button
						className="mt-4 rounded-md bg-[#f5ead7] px-3 py-2 font-medium text-[#76582c] text-xs"
						onClick={onReset}
						type="button"
					>
						Show all textual notes
					</button>
				</div>
			)}
		</section>
	);
}

function TextualNoteCard({ note }: { note: TextualNote }) {
	return (
		<article className="flex min-h-[204px] flex-col overflow-hidden rounded-lg border border-[#ebe8e2] bg-white p-3 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card">
			<div
				className={cn(
					"-mx-3 -mt-3 px-3 pt-2 pb-1.5",
					cardBackgrounds[note.tone],
				)}
			>
				<h3 className="font-serif text-[#263f5b] text-[16px] leading-5 dark:text-foreground">
					{note.title}
				</h3>
				<p className="mt-0.5 text-[#54718f] text-[9px]">{note.subtitle}</p>
			</div>
			<p className="mt-2 line-clamp-5 text-[#71849a] text-[10px] leading-[1.42] dark:text-muted-foreground">
				{note.description}
			</p>
			<div className="mt-auto flex items-center justify-between gap-2 pt-2">
				<span className="text-[#406588] text-[9px]">{note.passage}</span>
				<ArrowRightIcon
					aria-hidden="true"
					className="size-3 shrink-0 text-[#60748a]"
				/>
			</div>
		</article>
	);
}

function TextualNotesGuide() {
	const helpItems = [
		{
			description:
				"Learn why variations occur and what the manuscript evidence shows us.",
			icon: BookOpenIcon,
			title: "Understand Manuscript Differences",
			tone: "plum",
		},
		{
			description:
				"See how textual differences influence modern Bible translations.",
			icon: TextIcon,
			title: "Notice Translation Decisions",
			tone: "green",
		},
		{
			description:
				"Learn about the history of the text and how it was transmitted over time.",
			icon: FileTextIcon,
			title: "Gain Historical Perspective",
			tone: "blue",
		},
		{
			description:
				"Understand that core Christian beliefs are not affected by minor textual variations.",
			icon: LightbulbIcon,
			title: "Read with Confidence",
			tone: "gold",
		},
	] as const;
	const suggestions = [
		"Read the passage in context before focusing on a single verse.",
		"Compare the different readings and see how they are supported.",
		"Look at how major Bible translations handle the variation.",
		"Consider the historical and literary context of the passage.",
		"Be humble and open to learning from trusted resources and faithful scholars.",
	] as const;
	return (
		<aside className="space-y-4">
			<section className="rounded-lg border border-[#e8e3da] bg-white/60 px-5 py-5 shadow-[0_1px_4px_rgba(24,50,79,0.025)] dark:border-border dark:bg-card/70">
				<h2 className="font-serif text-[#294562] text-[18px] dark:text-foreground">
					How Textual Notes Help
				</h2>
				<div className="mt-4 space-y-4">
					{helpItems.map((item) => {
						const Icon = item.icon;
						return (
							<div className="flex gap-3" key={item.title}>
								<div
									className={cn(
										"flex size-10 shrink-0 items-center justify-center rounded-md",
										cardBackgrounds[item.tone],
										guideIconClasses[item.tone],
									)}
								>
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
