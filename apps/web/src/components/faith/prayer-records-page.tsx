import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { Separator } from "@berean-study/ui/components/separator";
import { Tabs, TabsList, TabsTrigger } from "@berean-study/ui/components/tabs";
import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	EllipsisIcon,
	FileTextIcon,
	FilterIcon,
	Globe2Icon,
	LeafIcon,
	LockIcon,
	LockKeyholeIcon,
	PencilIcon,
	PlusIcon,
	Share2Icon,
	SparklesIcon,
} from "lucide-react";

const prayers = [
	{
		category: "Guidance",
		date: "Apr 24, 2025",
		description:
			"Lord, give me wisdom and clarity as I consider the next steps in my career and ministry. Help me discern your will and trust your timing...",
		image: "bg-[url('/landing/cta-hills.png')]",
		privacy: "Private",
		title: "Guidance for next season",
	},
	{
		category: "Healing",
		date: "Apr 22, 2025",
		description:
			"Please bring healing and strength to my mom. Give our family peace during this season and surround her with your love.",
		image:
			"bg-[linear-gradient(145deg,rgba(253,224,178,.8),rgba(22,45,66,.9))]",
		privacy: "Public",
		title: "Healing for my mother",
	},
	{
		category: "Wisdom",
		date: "Apr 18, 2025",
		description:
			"Help me make wise decisions this week, especially regarding finances and upcoming opportunities.",
		image: "bg-[linear-gradient(145deg,#d7e6d1,#456442)]",
		privacy: "Private",
		title: "Sound wisdom in decisions",
	},
	{
		category: "Relationships",
		date: "Apr 14, 2025",
		description:
			"Lord, soften our hearts and help us rebuild trust. Give me grace to forgive and the courage to take the first step.",
		image: "bg-[linear-gradient(145deg,#a3d8df,#176577)]",
		privacy: "Public",
		title: "Reconciliation with a friend",
	},
	{
		category: "Thanksgiving",
		date: "Apr 10, 2025",
		description:
			"Thank you, Lord, for providing for our family. You have been so faithful through this season.",
		image: "bg-[url('/landing/cta-hills.png')] bg-bottom",
		privacy: "Reflection Added",
		title: "Thankful for His provision",
	},
	{
		category: "Outreach",
		date: "Apr 5, 2025",
		description:
			"Give me boldness and compassion to share the hope of Jesus with those around me, especially in my workplace.",
		image: "bg-[linear-gradient(145deg,#5d3e22,#16100b)]",
		privacy: "Public",
		title: "Opportunities to share the Gospel",
	},
] as const;

export function PrayerRecordsPage() {
	return (
		<div className="min-h-full px-5 py-6 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-3">
				<header className="relative min-h-31 pt-1">
					<h1 className="font-serif text-4xl text-primary tracking-[-0.035em] sm:text-5xl">
						Prayers
					</h1>
					<p className="mt-1 text-muted-foreground">
						Bring your requests to God and keep a record of His faithfulness.
					</p>
					<div className="absolute top-0 right-0 hidden w-72 text-center text-muted-foreground text-xs italic leading-4 xl:block">
						“Do not be anxious about anything, but in everything by prayer and
						supplication with thanksgiving let your requests be made known to
						God.”
						<span className="mt-2 block not-italic">Philippians 4:6</span>
					</div>
					<div className="mt-5 flex flex-wrap items-center justify-between gap-3">
						<Tabs value="prayers">
							<TabsList
								aria-label="Faith record view"
								className="h-10 rounded-lg bg-muted/55 p-1"
							>
								<TabsTrigger
									className="h-8 min-w-28 rounded-md px-5 text-sm after:hidden data-active:bg-background data-active:shadow-sm"
									value="prayers"
								>
									Prayers
								</TabsTrigger>
								<TabsTrigger
									render={<Link to="/library/testimonies" />}
									className="h-8 min-w-28 rounded-md px-5 text-sm after:hidden"
									value="testimonies"
								>
									Testimonies
								</TabsTrigger>
							</TabsList>
						</Tabs>
						<div className="flex items-center gap-2">
							<Button
								className="h-9 rounded-lg px-4 shadow-sm"
								render={<Link to="/library/prayers/new" />}
								size="lg"
							>
								<PlusIcon data-icon="inline-start" />
								New Prayer
							</Button>
							<Button
								className="h-9 rounded-lg px-4 shadow-sm"
								size="lg"
								variant="outline"
							>
								<FilterIcon data-icon="inline-start" />
								Filter
							</Button>
						</div>
					</div>
				</header>

				<div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(23rem,.92fr)]">
					<section
						className="flex min-w-0 flex-col gap-4"
						aria-labelledby="my-prayers-heading"
					>
						<PrayerSummary />
						<Card className="gap-0 rounded-xl py-0 shadow-[0_10px_30px_color-mix(in_oklch,var(--foreground),transparent_95%)] ring-foreground/8">
							<CardHeader className="flex-row items-center px-4 py-3">
								<CardTitle
									className="font-serif text-lg"
									id="my-prayers-heading"
								>
									My Prayers
								</CardTitle>
								<div className="ml-auto flex items-center gap-1 text-muted-foreground text-xs">
									Sort by:{" "}
									<span className="font-medium text-foreground">
										Most Recent
									</span>
									<ChevronDownIcon className="size-3.5" />
								</div>
							</CardHeader>
							<CardContent className="px-3 pb-2">
								{prayers.map((prayer, index) => (
									<PrayerRow index={index} key={prayer.title} prayer={prayer} />
								))}
							</CardContent>
						</Card>
					</section>
					<PrayerDetail />
				</div>
			</main>
		</div>
	);
}

function PrayerSummary() {
	const stats = [
		{
			icon: SparklesIcon,
			label: "Active Requests",
			note: "Still lifting these up to the Lord.",
			value: "6",
		},
		{
			icon: LeafIcon,
			label: "Reflections Added",
			note: "Moments of God's work and faithfulness.",
			value: "3",
		},
		{
			icon: LockKeyholeIcon,
			label: "Private Prayers",
			note: "Known only to you.",
			value: "2",
		},
	];

	return (
		<section className="grid gap-3 sm:grid-cols-3" aria-label="Prayer summary">
			{stats.map(({ icon: Icon, label, note, value }) => (
				<Card
					className="flex-row items-center gap-3 rounded-xl px-4 py-3 shadow-sm ring-foreground/8"
					key={label}
				>
					<div className="flex size-10 items-center justify-center rounded-full bg-primary/8 text-primary">
						<Icon className="size-5" strokeWidth={1.75} />
					</div>
					<div className="min-w-0">
						<p className="font-serif text-2xl leading-5">{value}</p>
						<p className="font-medium text-xs">{label}</p>
						<p className="truncate text-[10px] text-muted-foreground">{note}</p>
					</div>
				</Card>
			))}
		</section>
	);
}

function PrayerRow({
	index,
	prayer,
}: {
	index: number;
	prayer: (typeof prayers)[number];
}) {
	const isSelected = index === 0;
	const statusIcon =
		prayer.privacy === "Private"
			? LockIcon
			: prayer.privacy === "Public"
				? Globe2Icon
				: FileTextIcon;
	const StatusIcon = statusIcon;
	return (
		<div className={isSelected ? "rounded-lg bg-muted/65" : ""}>
			<div className="flex items-center gap-3 px-2 py-2.5">
				<div
					className={`size-14 shrink-0 rounded-md bg-center bg-cover ${prayer.image}`}
				/>
				<div className="min-w-0 flex-1">
					<h3 className="font-serif text-sm leading-4">{prayer.title}</h3>
					<p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground leading-4">
						{prayer.description}
					</p>
					<Badge
						className="mt-1 h-4 rounded-full bg-primary/10 px-2 text-[9px] text-primary"
						variant="secondary"
					>
						{prayer.category}
					</Badge>
				</div>
				<div className="hidden w-33 shrink-0 items-center justify-between gap-2 text-[11px] text-muted-foreground md:flex">
					<span>{prayer.date}</span>
					<span className="flex items-center gap-1">
						<StatusIcon className="size-3" />
						{prayer.privacy}
					</span>
				</div>
				<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
			</div>
			{index < prayers.length - 1 ? (
				<Separator className="mx-2 w-auto" />
			) : null}
		</div>
	);
}

function PrayerDetail() {
	return (
		<aside aria-label="Selected prayer">
			<Card className="gap-0 rounded-xl py-2 shadow-[0_10px_30px_color-mix(in_oklch,var(--foreground),transparent_95%)] ring-foreground/8 xl:sticky xl:top-6">
				<CardContent className="px-2">
					<div className="relative h-29 rounded-lg bg-[url('/landing/cta-hills.png')] bg-center bg-cover">
						<Button
							aria-label="More prayer actions"
							className="absolute top-3 right-3 size-7 rounded-md bg-background/90"
							size="icon-sm"
							variant="secondary"
						>
							<EllipsisIcon />
						</Button>
					</div>
					<div className="px-1 pt-2">
						<p className="flex items-center gap-1 text-muted-foreground text-xs">
							<LockIcon className="size-3" /> Private Prayer
						</p>
						<h2 className="mt-1 font-serif text-2xl leading-7">
							Guidance for next season
						</h2>
						<p className="mt-1 text-muted-foreground text-xs">April 24, 2025</p>
						<div className="mt-2 flex gap-2">
							<Badge
								className="rounded-full bg-primary/10 text-primary"
								variant="secondary"
							>
								Guidance
							</Badge>
							<Badge
								className="rounded-full bg-emerald-100 text-emerald-800"
								variant="secondary"
							>
								Career
							</Badge>
						</div>
						<p className="mt-3 text-sm leading-5">
							Lord, give me wisdom and clarity as I consider the next steps in
							my career and ministry. Help me discern your will and trust your
							timing. Open the right doors and close the wrong ones. Give me
							peace in the waiting and confidence that you are at work, even
							when I can’t see the full picture.
						</p>
						<p className="mt-1 font-medium text-sm">In Jesus’ name, amen.</p>
						<Separator className="my-3" />
						<DetailBlock icon={BookOpenIcon} title="Related Scripture">
							<p>
								“Trust in the Lord with all your heart, and lean not on your own
								understanding, in all your ways acknowledge him, and he will
								make your paths straight.”
							</p>
							<span className="mt-1 block">Proverbs 3:5–6</span>
						</DetailBlock>
						<DetailBlock icon={FileTextIcon} title="Latest Reflection">
							<div className="rounded-lg bg-muted/60 p-3">
								<p className="text-[11px] text-muted-foreground">
									April 20, 2025
								</p>
								<p>
									Feeling more at peace this week as I’ve been praying through
									this. God’s timing is good, and I’m learning to trust Him in
									the wait.
								</p>
							</div>
						</DetailBlock>
						<div className="mt-3 grid grid-cols-[1.3fr_.8fr_1.25fr] gap-2">
							<Button className="rounded-lg" size="sm">
								<FileTextIcon data-icon="inline-start" />
								Add Reflection
							</Button>
							<Button className="rounded-lg" size="sm" variant="outline">
								<PencilIcon data-icon="inline-start" />
								Edit
							</Button>
							<Button className="rounded-lg" size="sm" variant="outline">
								<Share2Icon data-icon="inline-start" />
								Share Privately
							</Button>
						</div>
						<p className="mt-3 text-[10px] text-muted-foreground">
							Created April 24, 2025 <span className="px-1">•</span> Updated
							April 24, 2025
						</p>
					</div>
				</CardContent>
			</Card>
		</aside>
	);
}

function DetailBlock({
	children,
	icon: Icon,
	title,
}: {
	children: React.ReactNode;
	icon: typeof BookOpenIcon;
	title: string;
}) {
	return (
		<section className="mt-3">
			<h3 className="flex items-center gap-2 font-medium text-xs">
				<Icon className="size-3.5 text-primary" />
				{title}
			</h3>
			<div className="mt-1 rounded-lg bg-muted/60 p-3 text-muted-foreground text-xs leading-4">
				{children}
			</div>
		</section>
	);
}
