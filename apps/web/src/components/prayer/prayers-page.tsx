import type { PrayerReflection } from "@berean-study/db/prayers";
import {
	emptyRichTextDocument,
	getDocumentText,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";
import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Separator } from "@berean-study/ui/components/separator";
import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	ChevronRightIcon,
	FileTextIcon,
	PencilIcon,
	PlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getPrayer, listPrayers } from "@/functions/prayers";

type Prayer = Awaited<ReturnType<typeof listPrayers>>[number];

export function PrayersPage() {
	const [prayers, setPrayers] = useState<Prayer[] | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [selectedPrayerId, setSelectedPrayerId] = useState<number | null>(null);
	const loadPrayers = useCallback(async () => {
		setLoadFailed(false);
		try {
			const nextPrayers = await listPrayers();
			setPrayers(nextPrayers);
			setSelectedPrayerId((current) =>
				nextPrayers.some((prayer) => prayer.id === current)
					? current
					: (nextPrayers[0]?.id ?? null),
			);
		} catch {
			setLoadFailed(true);
		}
	}, []);
	useEffect(() => {
		void loadPrayers();
	}, [loadPrayers]);
	const selectedPrayer =
		prayers?.find((prayer) => prayer.id === selectedPrayerId) ?? null;
	return (
		<div className="min-h-full px-5 py-6 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
				<header className="relative min-h-30 pt-1">
					<h1 className="font-serif text-4xl text-primary tracking-[-0.035em] sm:text-5xl">
						Prayers
					</h1>
					<p className="mt-1 text-muted-foreground">
						Bring your requests to God and keep a record of His faithfulness.
					</p>
					<div className="absolute top-0 right-0 hidden w-72 text-center text-muted-foreground text-xs italic leading-4 xl:block">
						“Do not be anxious about anything, but in everything by prayer and
						supplication with thanksgiving let your requests be made known to
						God.”<span className="mt-2 block not-italic">Philippians 4:6</span>
					</div>
					<div className="mt-5 flex items-center justify-between gap-3">
						<div className="flex h-10 items-center rounded-lg bg-muted/55 p-1">
							<span className="inline-flex h-8 min-w-28 items-center justify-center rounded-md bg-background px-5 font-medium text-sm shadow-sm">
								Prayers
							</span>
							<Link
								className="inline-flex h-8 min-w-28 items-center justify-center rounded-md px-5 text-muted-foreground text-sm hover:text-foreground"
								to="/library/testimonies"
							>
								Testimonies
							</Link>
						</div>
						<Button
							className="h-9 rounded-lg px-4 shadow-sm"
							render={<Link to="/library/prayers/new" />}
							size="lg"
						>
							<PlusIcon data-icon="inline-start" />
							New Prayer
						</Button>
					</div>
				</header>
				{loadFailed ? (
					<PrayerLoadError onRetry={loadPrayers} />
				) : (
					<div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(23rem,.92fr)]">
						<PrayerList
							onSelect={setSelectedPrayerId}
							prayers={prayers}
							selectedPrayerId={selectedPrayerId}
						/>
						<PrayerDetail prayer={selectedPrayer} />
					</div>
				)}
			</main>
		</div>
	);
}

function PrayerList({
	onSelect,
	prayers,
	selectedPrayerId,
}: {
	onSelect: (id: number) => void;
	prayers: Prayer[] | null;
	selectedPrayerId: number | null;
}) {
	if (prayers === null)
		return (
			<Card className="min-h-96 rounded-xl">
				<CardContent className="p-4 text-muted-foreground">
					Loading prayers…
				</CardContent>
			</Card>
		);
	if (prayers.length === 0)
		return (
			<Card className="rounded-xl">
				<Empty className="min-h-96">
					<EmptyHeader>
						<EmptyTitle>No prayers yet</EmptyTitle>
						<EmptyDescription>
							Record a prayer and it will appear here.
						</EmptyDescription>
					</EmptyHeader>
					<Button
						className="rounded-lg"
						render={<Link to="/library/prayers/new" />}
						size="sm"
					>
						<PlusIcon data-icon="inline-start" />
						New Prayer
					</Button>
				</Empty>
			</Card>
		);
	return (
		<Card className="gap-0 rounded-xl py-0 shadow-sm ring-foreground/8">
			<CardHeader className="flex-row items-center px-4 py-3">
				<CardTitle className="font-serif text-lg">My Prayers</CardTitle>
				<span className="ml-auto text-muted-foreground text-xs">
					Most Recent
				</span>
			</CardHeader>
			<CardContent className="px-3 pb-2">
				{prayers.map((prayer, index) => (
					<PrayerRow
						isSelected={prayer.id === selectedPrayerId}
						key={prayer.id}
						onSelect={() => onSelect(prayer.id)}
						prayer={prayer}
						showSeparator={index < prayers.length - 1}
					/>
				))}
			</CardContent>
		</Card>
	);
}

function PrayerRow({
	isSelected,
	onSelect,
	prayer,
	showSeparator,
}: {
	isSelected: boolean;
	onSelect: () => void;
	prayer: Prayer;
	showSeparator: boolean;
}) {
	return (
		<div className={isSelected ? "rounded-lg bg-muted/65" : ""}>
			<button
				className="flex w-full items-center gap-3 px-2 py-2.5 text-left"
				onClick={onSelect}
				type="button"
			>
				<div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-[url('/landing/cta-hills.png')] bg-center bg-cover text-primary">
					<BookOpenIcon className="size-5" />
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="font-serif text-sm leading-4">{prayer.title}</h3>
					<p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground leading-4">
						{getPrayerText(prayer.content)}
					</p>
					{prayer.category ? (
						<Badge
							className="mt-1 h-4 rounded-full bg-primary/10 px-2 text-[9px] text-primary"
							variant="secondary"
						>
							{prayer.category}
						</Badge>
					) : null}
				</div>
				<div className="hidden w-30 shrink-0 items-center justify-between gap-2 text-[11px] text-muted-foreground md:flex">
					<span>{formatDate(prayer.createdAt)}</span>
				</div>
				<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
			</button>
			{showSeparator ? <Separator className="mx-2 w-auto" /> : null}
		</div>
	);
}

function PrayerDetail({ prayer }: { prayer: Prayer | null }) {
	if (!prayer)
		return (
			<Card className="hidden min-h-96 rounded-xl xl:flex">
				<Empty>
					<EmptyHeader>
						<EmptyTitle>Select a prayer</EmptyTitle>
						<EmptyDescription>
							Choose a prayer to view its details.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</Card>
		);
	return (
		<aside>
			<Card className="gap-0 rounded-xl py-2 shadow-sm ring-foreground/8 xl:sticky xl:top-6">
				<CardContent className="px-2">
					<div className="h-29 rounded-lg bg-[url('/landing/cta-hills.png')] bg-center bg-cover" />
					<div className="px-1 pt-2">
						<h2 className="mt-1 font-serif text-2xl leading-7">
							{prayer.title}
						</h2>
						<Button
							className="mt-2"
							render={
								<Link
									params={{ prayerId: prayer.id }}
									to="/library/prayers/$prayerId/edit"
								/>
							}
							size="sm"
							variant="outline"
						>
							<PencilIcon data-icon="inline-start" />
							Edit prayer
						</Button>
						<p className="mt-1 text-muted-foreground text-xs">
							{formatDate(prayer.createdAt)}
						</p>
						{prayer.category ? (
							<Badge
								className="mt-2 rounded-full bg-primary/10 text-primary"
								variant="secondary"
							>
								{prayer.category}
							</Badge>
						) : null}
						<p className="mt-3 whitespace-pre-line text-sm leading-5">
							{getPrayerText(prayer.content)}
						</p>
						<Separator className="my-3" />
						<section>
							<div className="flex items-center justify-between gap-2">
								<h3 className="flex items-center gap-2 font-medium text-xs">
									<FileTextIcon className="size-3.5 text-primary" />
									Reflections
								</h3>
								<Button
									render={
										<Link
											params={{ prayerId: prayer.id }}
											to="/library/prayers/$prayerId/reflections/new"
										/>
									}
									size="sm"
								>
									<PlusIcon data-icon="inline-start" /> Add reflection
								</Button>
							</div>
							<PrayerReflections
								prayerId={prayer.id}
								reflectionCount={prayer.reflectionCount}
							/>
						</section>
					</div>
				</CardContent>
			</Card>
		</aside>
	);
}

function PrayerReflections({
	prayerId,
	reflectionCount,
}: {
	prayerId: number;
	reflectionCount: number;
}) {
	const [reflections, setReflections] = useState<
		NonNullable<Awaited<ReturnType<typeof getPrayer>>>["reflections"] | null
	>(null);

	useEffect(() => {
		let active = true;
		setReflections(null);
		void getPrayer({ data: { id: prayerId } })
			.then((prayer) => {
				if (active) setReflections(prayer?.reflections ?? []);
			})
			.catch(() => {
				if (active) setReflections([]);
			});
		return () => {
			active = false;
		};
	}, [prayerId]);

	if (reflectionCount === 0) {
		return (
			<p className="mt-2 rounded-lg bg-muted/60 p-3 text-muted-foreground text-xs">
				No reflections have been added yet.
			</p>
		);
	}

	if (reflections === null) {
		return (
			<p className="mt-2 text-muted-foreground text-xs">Loading reflections…</p>
		);
	}

	return (
		<div className="mt-2 space-y-2">
			<p className="text-muted-foreground text-xs">
				Look back on this prayer and record what you&apos;re learning, seeing,
				or experiencing.
			</p>
			{reflections.slice(0, 3).map((reflection: PrayerReflection) => (
				<article className="rounded-lg bg-muted/60 p-3" key={reflection.id}>
					<div className="flex items-start justify-between gap-2">
						<p className="font-medium text-xs">Reflection</p>
						<Button
							render={
								<Link
									params={{ prayerId, reflectionId: reflection.id }}
									to="/library/prayers/$prayerId/reflections/$reflectionId/edit"
								/>
							}
							size="sm"
							variant="ghost"
						>
							<PencilIcon /> Edit
						</Button>
					</div>
					<p className="mt-0.5 text-[11px] text-muted-foreground">
						{formatDate(reflection.createdAt)}
					</p>
					<p className="mt-1 line-clamp-3 text-xs leading-4">
						{getPrayerText(reflection.content)}
					</p>
				</article>
			))}
			{reflectionCount > 3 ? (
				<Link
					className="inline-flex font-medium text-primary text-xs hover:underline"
					to="/library/prayers"
				>
					View all reflections ({reflectionCount})
				</Link>
			) : null}
		</div>
	);
}

function PrayerLoadError({ onRetry }: { onRetry: () => void }) {
	return (
		<Card className="rounded-xl">
			<Empty className="min-h-72">
				<EmptyHeader>
					<EmptyTitle>Prayers are unavailable</EmptyTitle>
					<EmptyDescription>
						We couldn’t load your prayers right now.
					</EmptyDescription>
				</EmptyHeader>
				<Button className="rounded-lg" onClick={onRetry} size="sm">
					Try again
				</Button>
			</Empty>
		</Card>
	);
}

function getPrayerText(content: string) {
	try {
		const document = JSON.parse(content) as RichTextDocument;
		if (document.type === "doc") return getDocumentText(document).trim();
	} catch {}
	return content.trim() || getDocumentText(emptyRichTextDocument);
}
function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}
