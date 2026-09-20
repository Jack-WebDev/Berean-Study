import { createFileRoute } from "@tanstack/react-router";
import {
	BookOpen,
	ChevronDown,
	LockKeyhole,
	MoreHorizontal,
	Plus,
	Search,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_auth/library/testimonials/")({
	component: RouteComponent,
});

type Testimony = {
	id: number;
	title: string;
	excerpt: string;
	content: string[];
	date: string;
	passages: string[];
	visibility: "private" | "community";
	cover: string;
};

const testimonies: Testimony[] = [
	{
		id: 1,
		title: "Peace in the Waiting",
		excerpt:
			"God has been teaching me to find peace not in quick answers, but in His faithful presence.",
		content: [
			"Over the past few months, I've been walking through a season of waiting. What I thought would happen quickly has taken much longer than expected. At first, it was difficult — I found myself questioning, wondering, and growing impatient.",
			"But through this season, God has been teaching me to find peace not in quick answers, but in His faithful presence. His Word has reminded me that He is working, even when I cannot see it. I'm learning to trust His timing, to rest in His goodness, and to believe that He is using this season for my growth.",
			"I am grateful for His faithfulness. What felt like a delay has become a deeper trust in His care for me.",
		],
		date: "Oct 14, 2026",
		passages: ["Psalm 34:4", "Isaiah 40:31", "Romans 8:28"],
		visibility: "private",
		cover:
			"linear-gradient(135deg, #d6b47a 0%, #877458 35%, #34465c 70%, #17263b 100%)",
	},
	{
		id: 2,
		title: "Provision in Unexpected Ways",
		excerpt:
			"Just when we didn't know how things would work out, God provided through circumstances we never expected.",
		content: [
			"There were several moments when I could not see how everything was going to come together.",
			"Looking back, I can see provision in places I almost overlooked at the time. People helped at exactly the right moment, circumstances changed, and doors opened that I had not expected.",
			"This season has reminded me to trust God's provision without assuming I know beforehand what that provision must look like.",
		],
		date: "Oct 2, 2026",
		passages: ["Philippians 4:19", "Matthew 6:26"],
		visibility: "community",
		cover: "linear-gradient(135deg, #e4d6ae 0%, #89996c 45%, #3f654b 100%)",
	},
	{
		id: 3,
		title: "A Renewed Heart",
		excerpt:
			"Through a season of discouragement, the Lord renewed my heart through Scripture.",
		content: [
			"I had slowly become discouraged without realizing how deeply it was affecting the way I approached each day.",
			"Returning consistently to Scripture helped me see my circumstances more clearly. I was reminded that God's mercy is not exhausted by a difficult season.",
			"I still have questions, but I am no longer approaching them from the same place of discouragement.",
		],
		date: "Sep 18, 2026",
		passages: ["Lamentations 3:22–23", "2 Corinthians 4:16"],
		visibility: "private",
		cover: "linear-gradient(135deg, #dfd1bc 0%, #a5856c 45%, #5d493d 100%)",
	},
	{
		id: 4,
		title: "Learning to Cast My Cares",
		excerpt:
			"I've been learning what it means to bring anxiety to God instead of carrying it alone.",
		content: [
			"This did not happen in a single moment. It has been a repeated process of recognizing fear, praying honestly, and returning to what Scripture says.",
			"I am beginning to understand that trusting God does not require pretending difficult things are easy.",
			"It means learning where to take those fears when they come.",
		],
		date: "Aug 27, 2026",
		passages: ["1 Peter 5:7", "Philippians 4:6–7"],
		visibility: "community",
		cover: "linear-gradient(135deg, #dfc88f 0%, #7f956d 40%, #345248 100%)",
	},
	{
		id: 5,
		title: "Grateful for His Faithfulness",
		excerpt:
			"Looking back, I can see God's faithfulness in moments I barely noticed while I was living through them.",
		content: [
			"Some of the clearest signs of God's faithfulness only became obvious in hindsight.",
			"At the time, many of those moments felt ordinary. Looking back now, I can see how they were connected.",
			"I want to remember those things rather than allowing the next difficult season to make me forget them.",
		],
		date: "Aug 12, 2026",
		passages: ["Deuteronomy 7:9", "Psalm 136:1"],
		visibility: "private",
		cover: "linear-gradient(135deg, #e7c98c 0%, #9b765d 45%, #4b6470 100%)",
	},
];

type Filter = "all" | "recent" | "community";

function RouteComponent() {
	const [selectedId, setSelectedId] = useState(testimonies[0].id);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<Filter>("all");

	const filteredTestimonies = useMemo(() => {
		const query = search.trim().toLowerCase();

		return testimonies.filter((testimony, index) => {
			const matchesSearch =
				!query ||
				testimony.title.toLowerCase().includes(query) ||
				testimony.excerpt.toLowerCase().includes(query) ||
				testimony.passages.some((passage) =>
					passage.toLowerCase().includes(query),
				);

			const matchesFilter =
				filter === "all" ||
				(filter === "recent" && index < 3) ||
				(filter === "community" && testimony.visibility === "community");

			return matchesSearch && matchesFilter;
		});
	}, [filter, search]);

	const selectedTestimony =
		testimonies.find((testimony) => testimony.id === selectedId) ??
		testimonies[0];

	return (
		<main className="mx-auto w-full max-w-[1440px] px-8 py-8">
			<PageHeader />

			<div className="mt-8 border-slate-200/80 border-b">
				<div className="flex gap-7">
					<button
						type="button"
						className="pb-3 font-medium text-slate-500 text-sm transition-colors hover:text-slate-900"
					>
						Prayers
					</button>

					<button
						type="button"
						className="border-[#0c2a4d] border-b-2 pb-3 font-semibold text-[#0c2a4d] text-sm"
					>
						Testimonies
					</button>
				</div>
			</div>

			<div className="mt-5 flex flex-wrap items-center gap-3">
				<label className="relative min-w-[280px] flex-1">
					<Search
						aria-hidden="true"
						className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400"
					/>

					<input
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search testimonies..."
						className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-11 text-slate-900 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
					/>
				</label>

				<FilterButton
					active={filter === "all"}
					onClick={() => setFilter("all")}
				>
					All
				</FilterButton>

				<FilterButton
					active={filter === "recent"}
					onClick={() => setFilter("recent")}
				>
					Recent
				</FilterButton>

				<FilterButton
					active={filter === "community"}
					onClick={() => setFilter("community")}
				>
					Shared
				</FilterButton>

				<button
					type="button"
					className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-700 text-sm shadow-sm transition hover:bg-slate-50"
				>
					Most recent
					<ChevronDown className="size-4" />
				</button>
			</div>

			<div className="mt-5 grid min-h-[650px] gap-5 xl:grid-cols-[460px_minmax(0,1fr)]">
				<section className="space-y-2.5">
					{filteredTestimonies.map((testimony) => (
						<TestimonyListItem
							key={testimony.id}
							testimony={testimony}
							selected={testimony.id === selectedId}
							onSelect={() => setSelectedId(testimony.id)}
						/>
					))}

					{filteredTestimonies.length === 0 && (
						<div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white/50 px-6 text-center">
							<p className="font-semibold text-slate-900 text-sm">
								No testimonies found
							</p>
							<p className="mt-1 text-slate-500 text-sm">
								Try another search or filter.
							</p>
						</div>
					)}
				</section>

				<TestimonyDetail testimony={selectedTestimony} />
			</div>
		</main>
	);
}

function PageHeader() {
	return (
		<header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
			<div>
				<h1 className="font-serif text-4xl text-[#0b2545] tracking-tight">
					Prayers &amp; Testimonies
				</h1>

				<p className="mt-1.5 text-slate-500 text-sm">
					Personal faith records, kept alongside your study.
				</p>
			</div>

			<div className="flex flex-col items-start gap-4 lg:items-end">
				<button
					type="button"
					className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#b8750b] px-5 font-semibold text-sm text-white shadow-sm transition hover:bg-[#a96908] focus:outline-none focus:ring-4 focus:ring-amber-100"
				>
					<Plus className="size-4" />
					New Testimony
				</button>

				<blockquote className="max-w-sm text-right font-serif text-slate-500 text-sm italic leading-6">
					“Let them tell of the goodness of the LORD.”
					<footer className="mt-0.5 text-slate-400 not-italic">
						— Psalm 107:8
					</footer>
				</blockquote>
			</div>
		</header>
	);
}

function FilterButton({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={[
				"h-11 rounded-xl px-5 font-medium text-sm transition",
				active
					? "bg-[#0c2a4d] text-white shadow-sm"
					: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
			].join(" ")}
		>
			{children}
		</button>
	);
}

function TestimonyListItem({
	testimony,
	selected,
	onSelect,
}: {
	testimony: Testimony;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={[
				"w-full rounded-2xl border p-3 text-left transition",
				selected
					? "border-[#c78a2e] bg-[#fffaf0] shadow-sm"
					: "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
			].join(" ")}
		>
			<div className="flex gap-4">
				<div
					className="h-[92px] w-[92px] shrink-0 rounded-xl"
					style={{ background: testimony.cover }}
				/>

				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-3">
						<h2 className="truncate font-medium font-serif text-[#102b4e] text-[18px]">
							{testimony.title}
						</h2>

						<span className="shrink-0 text-slate-400 text-xs">
							{testimony.date}
						</span>
					</div>

					<p className="mt-1 line-clamp-2 text-slate-500 text-sm leading-5">
						{testimony.excerpt}
					</p>

					<div className="mt-3 flex items-center justify-between gap-3">
						<div className="flex min-w-0 gap-1.5 overflow-hidden">
							{testimony.passages.slice(0, 2).map((passage) => (
								<span
									key={passage}
									className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-[11px] text-slate-600"
								>
									{passage}
								</span>
							))}
						</div>

						<div className="flex shrink-0 items-center gap-2 text-slate-500 text-xs">
							{testimony.visibility === "private" ? (
								<>
									<LockKeyhole className="size-3.5" />
									Private
								</>
							) : (
								<>
									<Users className="size-3.5" />
									Community
								</>
							)}

							<MoreHorizontal className="ml-1 size-4" />
						</div>
					</div>
				</div>
			</div>
		</button>
	);
}

function TestimonyDetail({ testimony }: { testimony: Testimony }) {
	return (
		<article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div className="p-3">
				<div
					className="relative h-56 overflow-hidden rounded-xl"
					style={{ background: testimony.cover }}
				>
					<div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />

					<button
						type="button"
						aria-label="Testimony options"
						className="absolute top-4 right-4 grid size-9 place-items-center rounded-full border border-white/60 bg-white/90 text-slate-700 shadow-sm backdrop-blur"
					>
						<MoreHorizontal className="size-4" />
					</button>

					<div className="absolute -bottom-10 left-[8%] h-28 w-[36%] rotate-[-5deg] rounded-[50%] bg-[#27384a]/60 blur-[1px]" />
					<div className="absolute -bottom-14 left-[30%] h-36 w-[40%] rotate-[8deg] rounded-[50%] bg-[#172b3d]/70 blur-[1px]" />
					<div className="absolute right-[-3%] -bottom-16 h-40 w-[48%] rotate-[-4deg] rounded-[50%] bg-[#102438]/75 blur-[1px]" />
				</div>
			</div>

			<div className="px-7 pt-2 pb-7">
				<div className="flex items-start justify-between gap-6">
					<h2 className="font-serif text-3xl text-[#102b4e] tracking-tight">
						{testimony.title}
					</h2>

					<div className="shrink-0 text-right">
						<p className="text-slate-400 text-xs">{testimony.date}</p>

						<div className="mt-1 flex items-center justify-end gap-1.5 text-slate-500 text-xs">
							{testimony.visibility === "private" ? (
								<>
									<LockKeyhole className="size-3.5" />
									Private
								</>
							) : (
								<>
									<Users className="size-3.5" />
									Shared to Community
								</>
							)}
						</div>
					</div>
				</div>

				<blockquote className="mx-auto my-6 max-w-2xl text-center font-serif text-slate-500 text-sm italic leading-6">
					“I sought the LORD, and he answered me; he delivered me from all my
					fears.”
					<footer className="mt-1 text-slate-400 not-italic">
						— Psalm 34:4
					</footer>
				</blockquote>

				<div className="border-slate-100 border-t pt-6">
					<div className="max-w-3xl space-y-5 text-[15px] text-slate-700 leading-7">
						{testimony.content.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
				</div>

				<div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 lg:grid-cols-2">
					<section className="bg-[#faf9f6] p-5">
						<div className="flex items-center gap-2 font-semibold text-[#102b4e] text-sm">
							<BookOpen className="size-4" />
							Related Scripture
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							{testimony.passages.map((passage) => (
								<button
									key={passage}
									type="button"
									className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 text-xs transition hover:border-slate-300 hover:text-slate-900"
								>
									{passage}
								</button>
							))}
						</div>
					</section>

					<section className="bg-[#faf9f6] p-5">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="font-semibold text-[#102b4e] text-sm">
									Related records
								</p>

								<p className="mt-1 text-slate-500 text-sm leading-5">
									Connect prayers or notes that helped shape this testimony.
								</p>
							</div>

							<button
								type="button"
								className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 text-xs shadow-sm transition hover:bg-slate-50"
							>
								Manage
							</button>
						</div>
					</section>
				</div>
			</div>
		</article>
	);
}
